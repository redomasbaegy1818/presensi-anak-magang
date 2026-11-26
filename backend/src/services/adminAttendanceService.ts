import type { AttendanceEvidenceType } from '@prisma/client';
import {
  correctAttendanceWithAudit,
  findAttendanceDetailForAdmin,
  findAttendanceEvidenceStorageKey,
  listAttendancesForAdmin,
} from '../repositories/attendanceRepository.js';
import { AppError } from '../utils/appError.js';
import type {
  AdminAttendanceQuery,
  AdminCorrectAttendanceInput,
} from '../validation/adminSchemas.js';
import { readPrivateEvidenceFile } from './evidenceStorageService.js';

function combineDateAndWibTime(
  attendanceDate: Date,
  timeStr: string | null | undefined,
): Date | null | undefined {
  if (timeStr === undefined) return undefined;
  if (timeStr === null || timeStr === '') return null;
  const dateOnly = attendanceDate.toISOString().slice(0, 10);
  return new Date(`${dateOnly}T${timeStr}:00+07:00`);
}

export async function getAdminAttendanceList(query: AdminAttendanceQuery) {
  const { items, total, participantOptions } = await listAttendancesForAdmin({
    search: query.search,
    participantId: query.participantId,
    date: query.date,
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  return {
    records: items.map((item) => ({
      id: item.id,
      participantId: item.participantId,
      participantName: item.participant.fullName,
      nimNis: item.participant.nimNis,
      division: item.participant.division,
      attendanceDate: item.attendanceDate.toISOString().slice(0, 10),
      checkInAt: item.checkInAt?.toISOString() ?? null,
      checkOutAt: item.checkOutAt?.toISOString() ?? null,
      status: item.status,
      verificationStatus: item.verificationStatus,
      isCorrected: item.isCorrected,
      correctionCount: item._count.correctionLogs,
      hasCheckInEvidence: item.evidences.some((e) => e.type === 'CHECK_IN'),
      hasCheckOutEvidence: item.evidences.some((e) => e.type === 'CHECK_OUT'),
    })),
    total,
    page: query.page,
    limit: query.limit,
    participantOptions,
  };
}

export async function getAdminAttendanceDetail(id: string) {
  const detail = await findAttendanceDetailForAdmin(id);
  if (!detail) {
    throw AppError.notFound('Catatan presensi tidak ditemukan.');
  }

  return {
    record: {
      id: detail.id,
      participantId: detail.participantId,
      participantName: detail.participant.fullName,
      nimNis: detail.participant.nimNis,
      division: detail.participant.division,
      participantStatus: detail.participant.status,
      attendanceDate: detail.attendanceDate.toISOString().slice(0, 10),
      checkInAt: detail.checkInAt?.toISOString() ?? null,
      checkOutAt: detail.checkOutAt?.toISOString() ?? null,
      status: detail.status,
      verificationStatus: detail.verificationStatus,
      isCorrected: detail.isCorrected,
      notes: detail.notes,
      evidences: detail.evidences.map((e) => ({
        id: e.id,
        type: e.type,
        capturedAt: e.capturedAt.toISOString(),
      })),
      correctionLogs: detail.correctionLogs.map((log) => ({
        id: log.id,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        previousCheckInAt: log.previousCheckInAt?.toISOString() ?? null,
        newCheckInAt: log.newCheckInAt?.toISOString() ?? null,
        previousCheckOutAt: log.previousCheckOutAt?.toISOString() ?? null,
        newCheckOutAt: log.newCheckOutAt?.toISOString() ?? null,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
        adminLabel: log.adminUser.username || log.adminUser.email,
      })),
    },
  };
}

export async function correctAttendanceByAdmin(
  attendanceId: string,
  adminUserId: string,
  input: AdminCorrectAttendanceInput,
) {
  const existing = await findAttendanceDetailForAdmin(attendanceId);
  if (!existing) {
    throw AppError.notFound('Catatan presensi tidak ditemukan.');
  }

  const nextCheckInAt = combineDateAndWibTime(
    existing.attendanceDate,
    input.checkInTime,
  );
  const nextCheckOutAt = combineDateAndWibTime(
    existing.attendanceDate,
    input.checkOutTime,
  );

  const effectiveIn =
    nextCheckInAt === undefined ? existing.checkInAt : nextCheckInAt;
  const effectiveOut =
    nextCheckOutAt === undefined ? existing.checkOutAt : nextCheckOutAt;

  if (effectiveIn && effectiveOut && effectiveOut < effectiveIn) {
    throw AppError.badRequest(
      'Jam pulang tidak boleh lebih awal dari jam masuk.',
      'INVALID_TIME_ORDER',
      { checkOutTime: ['Jam pulang tidak boleh lebih awal dari jam masuk.'] },
    );
  }

  await correctAttendanceWithAudit({
    attendanceId: existing.id,
    adminUserId,
    newStatus: input.status,
    newCheckInAt: nextCheckInAt,
    newCheckOutAt: nextCheckOutAt,
    reason: input.reason,
  });

  const refreshed = await getAdminAttendanceDetail(existing.id);
  return {
    ...refreshed,
    message: 'Koreksi presensi berhasil disimpan dan tercatat di audit log.',
  };
}

export async function getAdminAttendanceEvidenceBuffer(
  attendanceId: string,
  type: AttendanceEvidenceType,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const evidence = await findAttendanceEvidenceStorageKey(attendanceId, type);
  if (!evidence) {
    throw AppError.notFound('Bukti foto presensi tidak ditemukan.');
  }

  const buffer = await readPrivateEvidenceFile(evidence.storageKey);
  if (!buffer) {
    throw AppError.notFound('File bukti presensi tidak tersedia di penyimpanan.');
  }

  return {
    buffer,
    mimeType: evidence.mimeType,
  };
}
