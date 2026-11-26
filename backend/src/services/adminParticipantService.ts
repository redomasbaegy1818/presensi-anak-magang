import { Prisma, type ParticipantStatus } from '@prisma/client';
import { env } from '../config/env.js';
import {
  deleteParticipantIfNoAttendance,
  findDuplicateParticipantConflicts,
  findParticipantById,
  findParticipantDetailForAdmin,
  listParticipantsForAdmin,
  updateParticipantInfo,
  updateParticipantStatus,
} from '../repositories/participantRepository.js';
import { createPasswordResetToken } from '../repositories/passwordResetRepository.js';
import { AppError } from '../utils/appError.js';
import { createSessionTokenPair } from '../utils/crypto.js';
import { normalizePhone } from '../validation/authSchemas.js';
import type {
  AdminParticipantsQuery,
  AdminUpdateParticipantInput,
} from '../validation/adminSchemas.js';
import { buildPasswordResetUrl } from './authService.js';

function mapParticipantDto(p: {
  id: string;
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  internshipStartDate: Date;
  internshipEndDate: Date;
  status: ParticipantStatus;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string; isActive: boolean };
  faceTemplate: { registeredAt: Date; updatedAt: Date } | null;
}) {
  return {
    id: p.id,
    fullName: p.fullName,
    nimNis: p.nimNis,
    universitySchool: p.universitySchool,
    major: p.major,
    division: p.division,
    phone: p.phone,
    email: p.user.email,
    internshipStartDate: p.internshipStartDate.toISOString().slice(0, 10),
    internshipEndDate: p.internshipEndDate.toISOString().slice(0, 10),
    status: p.status,
    faceRegistered: Boolean(p.faceTemplate),
    faceRegisteredAt: p.faceTemplate?.registeredAt.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getAdminParticipantsList(query: AdminParticipantsQuery) {
  const { items, total, divisions } = await listParticipantsForAdmin({
    search: query.search,
    status: query.status,
    division: query.division,
    faceStatus: query.faceStatus,
    page: query.page,
    limit: query.limit,
  });

  return {
    participants: items.map(mapParticipantDto),
    total,
    page: query.page,
    limit: query.limit,
    divisions,
  };
}

export async function getAdminParticipantDetail(id: string) {
  const detail = await findParticipantDetailForAdmin(id);
  if (!detail) {
    throw AppError.notFound('Data peserta magang tidak ditemukan.');
  }

  return {
    participant: mapParticipantDto(detail),
    recentAttendances: detail.attendances.map((a) => ({
      id: a.id,
      participantId: detail.id,
      participantName: detail.fullName,
      nimNis: detail.nimNis,
      division: detail.division,
      attendanceDate: a.attendanceDate.toISOString().slice(0, 10),
      checkInAt: a.checkInAt?.toISOString() ?? null,
      checkOutAt: a.checkOutAt?.toISOString() ?? null,
      status: a.status,
      verificationStatus: a.verificationStatus,
      isCorrected: a.isCorrected,
    })),
  };
}

export async function editParticipantByAdmin(
  id: string,
  input: AdminUpdateParticipantInput,
) {
  const existing = await findParticipantById(id);
  if (!existing) {
    throw AppError.notFound('Data peserta magang tidak ditemukan.');
  }

  const { emailExists, nimNisExists } = await findDuplicateParticipantConflicts(
    input.email,
    input.nimNis,
    { participantId: existing.id, userId: existing.userId },
  );

  if (emailExists || nimNisExists) {
    const details: Record<string, string[]> = {};
    if (emailExists) {
      details.email = ['Email sudah digunakan oleh akun lain.'];
    }
    if (nimNisExists) {
      details.nimNis = ['NIM/NIS sudah digunakan oleh peserta lain.'];
    }

    if (nimNisExists && !emailExists) {
      throw AppError.conflict(
        'NIM/NIS sudah digunakan oleh peserta lain.',
        'DUPLICATE_NIM_NIS',
        details,
      );
    }
    if (emailExists && !nimNisExists) {
      throw AppError.conflict(
        'Email sudah digunakan oleh akun lain.',
        'DUPLICATE_EMAIL',
        details,
      );
    }
    throw AppError.conflict(
      'Email dan NIM/NIS sudah digunakan oleh peserta lain.',
      'DUPLICATE_PARTICIPANT',
      details,
    );
  }

  try {
    const updated = await updateParticipantInfo({
      participantId: existing.id,
      userId: existing.userId,
      fullName: input.fullName,
      nimNis: input.nimNis,
      universitySchool: input.universitySchool,
      major: input.major,
      division: input.division,
      phone: normalizePhone(input.phone),
      email: input.email,
      internshipStartDate: new Date(`${input.internshipStartDate}T00:00:00.000Z`),
      internshipEndDate: new Date(`${input.internshipEndDate}T00:00:00.000Z`),
    });

    return {
      participant: mapParticipantDto(updated),
      message: 'Informasi peserta magang berhasil diperbarui.',
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
          'NIM/NIS sudah digunakan oleh peserta lain.',
          'DUPLICATE_NIM_NIS',
          { nimNis: ['NIM/NIS sudah digunakan oleh peserta lain.'] },
        );
      }
      throw AppError.conflict(
        'Email sudah digunakan oleh akun lain.',
        'DUPLICATE_EMAIL',
        { email: ['Email sudah digunakan oleh akun lain.'] },
      );
    }
    throw error;
  }
}

export async function setParticipantStatusByAdmin(
  id: string,
  status: ParticipantStatus,
) {
  const existing = await findParticipantById(id);
  if (!existing) {
    throw AppError.notFound('Data peserta magang tidak ditemukan.');
  }

  const updated = await updateParticipantStatus(existing.id, status);
  return {
    participant: mapParticipantDto(updated),
    message:
      status === 'ACTIVE'
        ? 'Status peserta magang berhasil diaktifkan.'
        : 'Status peserta magang berhasil dinonaktifkan.',
  };
}

export async function removeParticipantSafelyByAdmin(id: string) {
  const outcome = await deleteParticipantIfNoAttendance(id);

  if (outcome.status === 'NOT_FOUND') {
    throw AppError.notFound('Data peserta magang tidak ditemukan.');
  }

  if (outcome.status === 'HAS_ATTENDANCE') {
    throw AppError.conflict(
      'Peserta tidak dapat dihapus permanen karena sudah memiliki catatan presensi. Gunakan fitur Nonaktifkan untuk menutup akses tanpa menghilangkan riwayat laporan.',
      'PARTICIPANT_HAS_ATTENDANCE',
    );
  }

  return {
    deletedParticipantId: id,
    message: `Peserta ${outcome.fullName} (${outcome.nimNis}) berhasil dihapus permanen.`,
  };
}

export async function createParticipantResetLinkByAdmin(
  id: string,
  adminUserId: string,
) {
  const existing = await findParticipantById(id);
  if (!existing) {
    throw AppError.notFound('Data peserta magang tidak ditemukan.');
  }

  if (existing.status !== 'ACTIVE' || !existing.user.isActive) {
    throw AppError.conflict(
      'Aktifkan akun peserta terlebih dahulu sebelum membuat tautan reset kata sandi.',
      'PARTICIPANT_INACTIVE',
    );
  }

  const { token, tokenHash } = createSessionTokenPair();
  const expiresInMinutes = env.PASSWORD_RESET_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await createPasswordResetToken({
    userId: existing.userId,
    tokenHash,
    expiresAt,
    createdByAdminId: adminUserId,
  });

  return {
    resetUrl: buildPasswordResetUrl(token),
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes,
    message: `Tautan reset kata sandi satu kali untuk ${existing.fullName} berhasil dibuat (berlaku ${expiresInMinutes} menit).`,
  };
}
