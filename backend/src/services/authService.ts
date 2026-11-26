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
  findParticipantByUserId,
} from '../repositories/participantRepository.js';
import {
  consumePasswordResetTokenAndUpdatePassword,
  createPasswordResetToken,
  findValidPasswordResetToken,
} from '../repositories/passwordResetRepository.js';
import { AppError } from '../utils/appError.js';
import {
  createSessionTokenPair,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from '../utils/crypto.js';
import {
  normalizePhone,
  type ParticipantRegisterInput,
} from '../validation/authSchemas.js';
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
    const expiresInMinutes = env.PASSWORD_RESET_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = buildPasswordResetUrl(token);
    try {
      await sendPasswordResetEmail({
        to: user.email,
        recipientName,
        portal,
        resetUrl,
        expiresInMinutes,
      });
    } catch (error) {
      console.error('[PASSWORD RESET] Gagal mengirim email reset:', error);
    }
  }

  return {
    smtpConfigured,
    message: smtpConfigured
      ? 'Jika akun ditemukan dan aktif, tautan pengaturan ulang kata sandi telah dikirimkan ke email terdaftar.'
      : 'Permintaan diproses. Layanan email kantor belum diaktifkan — hubungi admin kantor (untuk peserta) atau cek konsol server backend saat pengembangan.',
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
