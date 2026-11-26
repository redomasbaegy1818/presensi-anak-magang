import { prisma } from '../lib/prisma.js';
import { findParticipantById } from '../repositories/participantRepository.js';
import {
  createPermissionRequest,
  findOverlappingPermission,
  findPermissionById,
  listPermissionsForAdmin,
  listPermissionsForParticipant,
  reviewPermissionWithAttendanceSync,
} from '../repositories/permissionRepository.js';
import { AppError } from '../utils/appError.js';
import type {
  AdminPermissionsQuery,
  AdminReviewPermissionInput,
  ParticipantCreatePermissionInput,
} from '../validation/permissionSchemas.js';

function mapPermissionDto(item: Awaited<ReturnType<typeof findPermissionById>>) {
  if (!item) return null;
  return {
    id: item.id,
    participantId: item.participantId,
    participantName: item.participant.fullName,
    nimNis: item.participant.nimNis,
    division: item.participant.division,
    type: item.type,
    startDate: item.startDate.toISOString().slice(0, 10),
    endDate: item.endDate.toISOString().slice(0, 10),
    reason: item.reason,
    status: item.status,
    adminNote: item.adminNote,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    reviewedByLabel:
      item.reviewedBy?.username || item.reviewedBy?.email || null,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function submitParticipantPermission(
  participantId: string,
  input: ParticipantCreatePermissionInput,
) {
  const participant = await findParticipantById(participantId);
  if (
    !participant ||
    !participant.user.isActive ||
    participant.status !== 'ACTIVE'
  ) {
    throw AppError.forbidden(
      'Status kepesertaan Anda saat ini nonaktif. Hubungi admin kantor.',
    );
  }

  const pStart = participant.internshipStartDate.toISOString().slice(0, 10);
  const pEnd = participant.internshipEndDate.toISOString().slice(0, 10);
  if (input.startDate < pStart || input.endDate > pEnd) {
    throw AppError.badRequest(
      'Tanggal izin harus berada di dalam periode magang Anda.',
      'OUTSIDE_INTERNSHIP_PERIOD',
      {
        startDate: ['Tanggal izin di luar periode magang Anda.'],
      },
    );
  }

  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`);

  const overlap = await findOverlappingPermission(
    participant.id,
    startDate,
    endDate,
  );
  if (overlap) {
    throw AppError.conflict(
      'Sudah ada pengajuan izin yang menunggu atau disetujui pada rentang tanggal tersebut.',
      'OVERLAPPING_PERMISSION',
    );
  }

  const attended = await prisma.attendance.findFirst({
    where: {
      participantId: participant.id,
      attendanceDate: { gte: startDate, lte: endDate },
      status: { in: ['PRESENT', 'LATE'] },
    },
    select: { attendanceDate: true },
  });
  if (attended) {
    throw AppError.conflict(
      `Anda sudah tercatat hadir pada tanggal ${attended.attendanceDate.toISOString().slice(0, 10)}.`,
      'ALREADY_ATTENDED_DATE',
    );
  }

  const created = await createPermissionRequest({
    participantId: participant.id,
    type: input.type,
    startDate,
    endDate,
    reason: input.reason,
  });

  return {
    permission: mapPermissionDto(created)!,
    message:
      'Pengajuan izin berhasil dikirim dan dapat langsung dipantau oleh admin.',
  };
}

export async function getParticipantPermissionsList(participantId: string) {
  const items = await listPermissionsForParticipant(participantId);
  return {
    permissions: items.map((item) => mapPermissionDto(item)!),
  };
}

export async function getAdminPermissionsList(query: AdminPermissionsQuery) {
  const { items, total, pendingCount } = await listPermissionsForAdmin({
    search: query.search,
    status: query.status,
    type: query.type,
    date: query.date,
    page: query.page,
    limit: query.limit,
  });

  return {
    permissions: items.map((item) => mapPermissionDto(item)!),
    total,
    pendingCount,
    page: query.page,
    limit: query.limit,
  };
}

export async function reviewAdminPermission(
  id: string,
  adminUserId: string,
  input: AdminReviewPermissionInput,
) {
  const existing = await findPermissionById(id);
  if (!existing) {
    throw AppError.notFound('Pengajuan izin tidak ditemukan.');
  }
  if (existing.status !== 'PENDING') {
    throw AppError.conflict(
      'Pengajuan izin ini sudah diproses sebelumnya.',
      'PERMISSION_ALREADY_REVIEWED',
    );
  }

  const updated = await reviewPermissionWithAttendanceSync({
    id: existing.id,
    status: input.status,
    adminNote: input.adminNote,
    adminUserId,
  });

  if (!updated) {
    throw AppError.notFound('Pengajuan izin tidak ditemukan.');
  }

  return {
    permission: mapPermissionDto(updated)!,
    message:
      input.status === 'APPROVED'
        ? 'Pengajuan izin disetujui dan otomatis tercatat pada data presensi.'
        : 'Pengajuan izin ditolak dengan catatan admin.',
  };
}
