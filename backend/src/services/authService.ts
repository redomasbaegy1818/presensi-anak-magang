import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import {
  createUserSession,
  deleteSessionByTokenHash,
  findUserByIdentifier,
} from '../repositories/authRepository.js';
import {
  createParticipantWithUser,
  findDuplicateParticipantConflicts,
  findParticipantByEmailAndNimNis,
  findParticipantByUserId,
} from '../repositories/participantRepository.js';
import {
  consumePasswordResetTokenAndUpdatePassword,
  createPasswordResetToken,
  findActiveResetTokenForUser,
  findValidPasswordResetToken,
  incrementResetCodeAttempts,
} from '../repositories/passwordResetRepository.js';
import { AppError } from '../utils/appError.js';
import {
  createSessionTokenPair,
  hashPassword,
  hashSessionToken,
  safeCompareStrings,
  verifyPassword,
} from '../utils/crypto.js';
import {
  normalizePhone,
  type ParticipantRegisterInput,
} from '../validation/authSchemas.js';
import { verifyParticipantFaceInternal } from './faceVerificationService.js';
import { isSmtpConfigured, sendPasswordResetEmail } from './mailerService.js';
import type { AuthUserContext } from './sessionService.js';

// Pre-computed dummy scrypt hash to keep response timing consistent when user is not found.
const DUMMY_PASSWORD_HASH =
  '00112233445566778899aabbccddeeff:' + '00'.repeat(64);

function resolveSessionTtlHours(rememberMe: boolean): number {
  return rememberMe ? Math.max(env.SESSION_TTL_HOURS, 168) : env.SESSION_TTL_HOURS;
}

function getSessionExpiryDate(ttlHours: number = env.SESSION_TTL_HOURS): Date {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}

export async function loginAdmin(
  identifier: string,
  password: string,
  rememberMe: boolean = false,
): Promise<{ token: string; ttlHours: number; user: AuthUserContext }> {
  const user = await findUserByIdentifier(identifier);
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyPassword(password, hashToVerify);

  if (!user || !passwordValid || user.role !== 'ADMIN') {
    throw AppError.unauthorized('Email/username atau kata sandi tidak sesuai.');
  }

  if (!user.isActive) {
    throw AppError.forbidden(
      'Akun admin Anda sedang dinonaktifkan. Hubungi administrator sistem.',
    );
  }

  const ttlHours = resolveSessionTtlHours(rememberMe);
  const { token, tokenHash } = createSessionTokenPair();
  await createUserSession(user.id, tokenHash, getSessionExpiryDate(ttlHours));

  return {
    token,
    ttlHours,
    user: {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      participant: null,
    },
  };
}

export async function loginParticipant(
  email: string,
  password: string,
  rememberMe: boolean = false,
): Promise<{ token: string; ttlHours: number; user: AuthUserContext }> {
  const user = await findUserByIdentifier(email);
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyPassword(password, hashToVerify);

  if (!user || !passwordValid || user.role !== 'PARTICIPANT') {
    throw AppError.unauthorized('Email atau kata sandi tidak sesuai.');
  }

  if (!user.isActive) {
    throw AppError.forbidden(
      'Status kepesertaan Anda sedang nonaktif. Hubungi admin kantor.',
    );
  }

  const participant = await findParticipantByUserId(user.id);
  if (!participant || participant.status !== 'ACTIVE') {
    throw AppError.forbidden(
      'Status kepesertaan Anda sedang nonaktif. Hubungi admin kantor.',
    );
  }

  const ttlHours = resolveSessionTtlHours(rememberMe);
  const { token, tokenHash } = createSessionTokenPair();
  await createUserSession(user.id, tokenHash, getSessionExpiryDate(ttlHours));

  return {
    token,
    ttlHours,
    user: {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      participant: {
        id: participant.id,
        fullName: participant.fullName,
        nimNis: participant.nimNis,
        division: participant.division,
        status: participant.status,
        faceRegistered: Boolean(participant.faceTemplate),
      },
    },
  };
}

export async function registerParticipant(input: ParticipantRegisterInput) {
  const { emailExists, nimNisExists } = await findDuplicateParticipantConflicts(
    input.email,
    input.nimNis,
  );

  if (emailExists || nimNisExists) {
    const details: Record<string, string[]> = {};
    if (emailExists) {
      details.email = ['Email sudah terdaftar pada akun lain.'];
    }
    if (nimNisExists) {
      details.nimNis = ['NIM/NIS sudah terdaftar di sistem.'];
    }

    if (emailExists && nimNisExists) {
      throw AppError.conflict(
        'Email dan NIM/NIS sudah terdaftar di sistem.',
        'DUPLICATE_PARTICIPANT',
        details,
      );
    }
    if (nimNisExists) {
      throw AppError.conflict(
        'NIM/NIS sudah terdaftar di sistem.',
        'DUPLICATE_NIM_NIS',
        details,
      );
    }
    throw AppError.conflict(
      'Email sudah terdaftar di sistem.',
      'DUPLICATE_EMAIL',
      details,
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const created = await createParticipantWithUser({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      nimNis: input.nimNis,
      universitySchool: input.universitySchool,
      major: input.major,
      division: input.division,
      phone: normalizePhone(input.phone),
      internshipStartDate: new Date(`${input.internshipStartDate}T00:00:00.000Z`),
      internshipEndDate: new Date(`${input.internshipEndDate}T00:00:00.000Z`),
    });

    const { token, tokenHash } = createSessionTokenPair();
    await createUserSession(created.userId, tokenHash, getSessionExpiryDate());

    const user: AuthUserContext = {
      userId: created.userId,
      email: created.user.email,
      username: null,
      role: 'PARTICIPANT',
      isActive: created.user.isActive,
      participant: {
        id: created.id,
        fullName: created.fullName,
        nimNis: created.nimNis,
        division: created.division,
        status: created.status,
        faceRegistered: false,
      },
    };

    return {
      token,
      user,
      participant: {
        id: created.id,
        fullName: created.fullName,
        nimNis: created.nimNis,
        universitySchool: created.universitySchool,
        major: created.major,
        division: created.division,
        phone: created.phone,
        email: created.user.email,
        internshipStartDate: created.internshipStartDate.toISOString().slice(0, 10),
        internshipEndDate: created.internshipEndDate.toISOString().slice(0, 10),
        status: created.status,
        faceRegistered: false,
        faceRegisteredAt: null,
      },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target ?? '');

      if (target.includes('nimNis')) {
        throw AppError.conflict(
          'NIM/NIS sudah terdaftar di sistem.',
          'DUPLICATE_NIM_NIS',
          { nimNis: ['NIM/NIS sudah terdaftar di sistem.'] },
        );
      }
      throw AppError.conflict(
        'Email sudah terdaftar di sistem.',
        'DUPLICATE_EMAIL',
        { email: ['Email sudah terdaftar di sistem.'] },
      );
    }
    throw error;
  }
}

export async function logoutByToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await deleteSessionByTokenHash(tokenHash);
}

export function buildPasswordResetUrl(rawToken: string): string {
  const origin = env.APP_ORIGIN.replace(/\/+$/, '');
  return `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export async function requestPasswordReset(
  identifier: string,
  portal: 'PARTICIPANT' | 'ADMIN',
) {
  const smtpConfigured = isSmtpConfigured();
  const user = await findUserByIdentifier(identifier);

  let eligible = Boolean(user && user.isActive && user.role === portal);
  let recipientName = user?.username || user?.email || 'Pengguna';

  if (eligible && user && user.role === 'PARTICIPANT') {
    const participant = await findParticipantByUserId(user.id);
    if (!participant || participant.status !== 'ACTIVE') {
      eligible = false;
    } else {
      recipientName = participant.fullName;
    }
  }

  if (eligible && user) {
    const { token, tokenHash } = createSessionTokenPair();
    const verificationCode = randomInt(100000, 1000000).toString();
    const codeHash = hashSessionToken(`${user.id}:${verificationCode}`);
    const expiresInMinutes = env.PASSWORD_RESET_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await createPasswordResetToken({
      userId: user.id,
      tokenHash,
      codeHash,
      expiresAt,
    });

    const resetUrl = buildPasswordResetUrl(token);
    try {
      await sendPasswordResetEmail({
        to: user.email,
        recipientName,
        portal,
        verificationCode,
        resetUrl,
        expiresInMinutes,
      });
    } catch (error) {
      console.error('[PASSWORD RESET] Gagal mengirim email reset:', error);
    }
  }

  return {
    smtpConfigured,
    expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
    message: smtpConfigured
      ? 'Jika akun terdaftar dan aktif, kami telah mengirimkan kode verifikasi 6 digit serta tautan reset kata sandi ke email Anda.'
      : 'Permintaan diproses. Layanan email kantor belum dikonfigurasi — masukkan kode 6 digit / tautan dari konsol server backend (dev), atau minta tautan reset kepada Admin kantor.',
  };
}

const MAX_RESET_CODE_ATTEMPTS = 5;

async function validateActiveUserAndResetCode(
  identifier: string,
  portal: 'PARTICIPANT' | 'ADMIN',
  code: string,
) {
  const user = await findUserByIdentifier(identifier);
  if (!user || !user.isActive || user.role !== portal) {
    throw AppError.badRequest(
      'Kode verifikasi tidak valid atau sudah kedaluwarsa.',
      'INVALID_RESET_CODE',
    );
  }

  let accountLabel = user.username || user.email;
  if (user.role === 'PARTICIPANT') {
    const participant = await findParticipantByUserId(user.id);
    if (!participant || participant.status !== 'ACTIVE') {
      throw AppError.badRequest(
        'Kode verifikasi tidak valid atau sudah kedaluwarsa.',
        'INVALID_RESET_CODE',
      );
    }
    accountLabel = participant.fullName;
  }

  const activeToken = await findActiveResetTokenForUser(user.id);
  if (!activeToken || !activeToken.codeHash) {
    throw AppError.badRequest(
      'Kode verifikasi tidak valid atau sudah kedaluwarsa.',
      'INVALID_RESET_CODE',
    );
  }

  const submittedCodeHash = hashSessionToken(`${user.id}:${code.trim()}`);
  if (!safeCompareStrings(activeToken.codeHash, submittedCodeHash)) {
    const nextAttempts = activeToken.codeAttempts + 1;
    await incrementResetCodeAttempts(
      activeToken.id,
      nextAttempts,
      MAX_RESET_CODE_ATTEMPTS,
    );
    if (nextAttempts >= MAX_RESET_CODE_ATTEMPTS) {
      throw AppError.badRequest(
        'Terlalu banyak percobaan kode salah. Silakan minta kode verifikasi baru.',
        'RESET_CODE_LOCKED',
      );
    }
    throw AppError.badRequest(
      'Kode verifikasi tidak valid atau sudah kedaluwarsa.',
      'INVALID_RESET_CODE',
    );
  }

  return {
    tokenId: activeToken.id,
    userId: user.id,
    portal: user.role,
    accountLabel,
    expiresAt: activeToken.expiresAt.toISOString(),
  };
}

export async function verifyPasswordResetCode(
  identifier: string,
  portal: 'PARTICIPANT' | 'ADMIN',
  code: string,
) {
  const validated = await validateActiveUserAndResetCode(
    identifier,
    portal,
    code,
  );
  return {
    valid: true,
    portal: validated.portal,
    accountLabel: validated.accountLabel,
    expiresAt: validated.expiresAt,
  };
}

export async function confirmPasswordResetWithCode(
  identifier: string,
  portal: 'PARTICIPANT' | 'ADMIN',
  code: string,
  newPassword: string,
) {
  const validated = await validateActiveUserAndResetCode(
    identifier,
    portal,
    code,
  );
  const newPasswordHash = await hashPassword(newPassword);

  await consumePasswordResetTokenAndUpdatePassword({
    tokenId: validated.tokenId,
    userId: validated.userId,
    newPasswordHash,
  });

  return {
    portal: validated.portal,
    message:
      'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
  };
}

export async function verifyParticipantFaceForReset(
  email: string,
  nimNis: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
) {
  const participant = await findParticipantByEmailAndNimNis(email, nimNis);

  if (
    !participant ||
    !participant.user.isActive ||
    participant.status !== 'ACTIVE'
  ) {
    throw AppError.badRequest(
      'Data peserta tidak cocok atau akun sedang nonaktif. Periksa kembali Email dan NIM/NIS Anda.',
      'FACE_RESET_PARTICIPANT_NOT_FOUND',
    );
  }

  if (!participant.faceTemplate) {
    throw AppError.badRequest(
      'Akun ini belum memiliki data wajah terdaftar. Silakan minta tautan reset kata sandi kepada Admin kantor.',
      'FACE_NOT_REGISTERED',
    );
  }

  const verification = await verifyParticipantFaceInternal(
    participant.id,
    imageBuffer,
    mimeType,
    filename,
  );

  if (!verification.matched) {
    return {
      verified: false,
      verificationStatus: verification.status,
      bbox: verification.bbox,
      message: verification.message,
    };
  }

  const { token, tokenHash } = createSessionTokenPair();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await createPasswordResetToken({
    userId: participant.userId,
    tokenHash,
    expiresAt,
  });

  return {
    verified: true,
    verificationStatus: verification.status,
    bbox: verification.bbox,
    resetToken: token,
    accountLabel: participant.fullName,
    message: 'Verifikasi wajah berhasil! Silakan buat kata sandi baru Anda.',
  };
}

export async function verifyPasswordResetToken(rawToken: string) {
  const tokenHash = hashSessionToken(rawToken);
  const record = await findValidPasswordResetToken(tokenHash);

  if (
    !record ||
    !record.user.isActive ||
    (record.user.role === 'PARTICIPANT' &&
      record.user.participant?.status !== 'ACTIVE')
  ) {
    throw AppError.badRequest(
      'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa.',
      'INVALID_RESET_TOKEN',
    );
  }

  return {
    valid: true,
    portal: record.user.role,
    accountLabel:
      record.user.participant?.fullName ||
      record.user.username ||
      record.user.email,
    expiresAt: record.expiresAt.toISOString(),
  };
}

export async function confirmPasswordReset(
  rawToken: string,
  newPassword: string,
) {
  const tokenHash = hashSessionToken(rawToken);
  const record = await findValidPasswordResetToken(tokenHash);

  if (
    !record ||
    !record.user.isActive ||
    (record.user.role === 'PARTICIPANT' &&
      record.user.participant?.status !== 'ACTIVE')
  ) {
    throw AppError.badRequest(
      'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa.',
      'INVALID_RESET_TOKEN',
    );
  }

  const newPasswordHash = await hashPassword(newPassword);
  await consumePasswordResetTokenAndUpdatePassword({
    tokenId: record.id,
    userId: record.userId,
    newPasswordHash,
  });

  return {
    portal: record.user.role,
    message:
      'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
  };
}
