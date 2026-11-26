import { Prisma, type AttendanceStatus } from '@prisma/client';
import { env } from '../config/env.js';
import {
  createCheckInAttendance,
  findParticipantAttendanceByDate,
  listParticipantAttendanceHistory,
  recordCheckOutAttendance,
} from '../repositories/attendanceRepository.js';
import { findParticipantById } from '../repositories/participantRepository.js';
import { getOrCreateAttendanceSetting } from '../repositories/settingsRepository.js';
import { AppError } from '../utils/appError.js';
import {
  getWibDateTimeParts,
  parseHhMmToMinutes,
} from '../utils/dateWib.js';
import {
  deletePrivateEvidenceFile,
  savePrivateEvidenceFile,
} from './evidenceStorageService.js';
import {
  verifyParticipantFaceInternal,
  type FaceVerificationState,
} from './faceVerificationService.js';

export type AttendanceActionType = 'CHECK_IN' | 'CHECK_OUT';

export interface PublicAttendanceSummaryItem {
  id: string;
  participantName: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  isCorrected: boolean;
}

export interface TodayAttendanceSummary {
  attendanceDate: string;
  nextAction: AttendanceActionType | 'COMPLETED';
  faceRegistered: boolean;
  participantActive: boolean;
  withinInternshipPeriod: boolean;
  rules: {
    checkInStartTime: string;
    workStartTime: string;
    lateToleranceMinutes: number;
    workEndTime: string;
    checkOutEndTime: string;
  };
  todayRecord: PublicAttendanceSummaryItem | null;
}

export interface AttendanceMarkResult {
  recorded: boolean;
  verificationStatus: FaceVerificationState;
  message: string;
  attendance?: {
    id: string;
    participantName: string;
    attendanceType: AttendanceActionType;
    attendanceDate: string;
    recordedAt: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: AttendanceStatus;
    confirmationMessage: string;
  };
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getParticipantTodayAttendance(
  participantId: string,
  now: Date = new Date(),
): Promise<TodayAttendanceSummary> {
  const participant = await findParticipantById(participantId);
  if (!participant) {
    throw AppError.notFound('Profil peserta tidak ditemukan.');
  }

  const setting = await getOrCreateAttendanceSetting();
  const wib = getWibDateTimeParts(now, env.OFFICE_TIMEZONE);
  const startStr = toDateOnlyString(participant.internshipStartDate);
  const endStr = toDateOnlyString(participant.internshipEndDate);
  const withinInternshipPeriod = wib.dateStr >= startStr && wib.dateStr <= endStr;

  const existing = await findParticipantAttendanceByDate(
    participant.id,
    wib.attendanceDate,
  );

  let nextAction: AttendanceActionType | 'COMPLETED' = 'CHECK_IN';
  if (existing?.checkInAt && existing.checkOutAt) {
    nextAction = 'COMPLETED';
  } else if (existing?.checkInAt && !existing.checkOutAt) {
    nextAction = 'CHECK_OUT';
  }

  return {
    attendanceDate: wib.dateStr,
    nextAction,
    faceRegistered: Boolean(participant.faceTemplate),
    participantActive:
      participant.status === 'ACTIVE' && participant.user.isActive,
    withinInternshipPeriod,
    rules: {
      checkInStartTime: setting.checkInStartTime,
      workStartTime: setting.workStartTime,
      lateToleranceMinutes: setting.lateToleranceMinutes,
      workEndTime: setting.workEndTime,
      checkOutEndTime: setting.checkOutEndTime,
    },
    todayRecord: existing
      ? {
          id: existing.id,
          participantName: participant.fullName,
          attendanceDate: toDateOnlyString(existing.attendanceDate),
          checkInAt: existing.checkInAt?.toISOString() ?? null,
          checkOutAt: existing.checkOutAt?.toISOString() ?? null,
          status: existing.status,
          isCorrected: existing.isCorrected,
        }
      : null,
  };
}

export async function markParticipantAttendance(
  participantId: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
  options?: {
    requestedType?: AttendanceActionType;
    now?: Date;
  },
): Promise<AttendanceMarkResult> {
  const now = options?.now ?? new Date();
  const participant = await findParticipantById(participantId);

  if (!participant || !participant.user.isActive || participant.status !== 'ACTIVE') {
    throw AppError.forbidden(
      'Status kepesertaan Anda saat ini nonaktif. Hubungi admin kantor.',
    );
  }

  const wib = getWibDateTimeParts(now, env.OFFICE_TIMEZONE);
  const startStr = toDateOnlyString(participant.internshipStartDate);
  const endStr = toDateOnlyString(participant.internshipEndDate);
  if (wib.dateStr < startStr || wib.dateStr > endStr) {
    throw new AppError(
      403,
      'OUTSIDE_INTERNSHIP_PERIOD',
      'Periode magang Anda belum dimulai atau telah berakhir.',
    );
  }

  if (!participant.faceTemplate) {
    throw AppError.badRequest(
      'Data wajah Anda belum terdaftar. Selesaikan pendaftaran wajah terlebih dahulu.',
      'UNKNOWN_PARTICIPANT',
    );
  }

  const existing = await findParticipantAttendanceByDate(
    participant.id,
    wib.attendanceDate,
  );

  let attendanceType: AttendanceActionType;
  if (!existing) {
    if (options?.requestedType === 'CHECK_OUT') {
      throw AppError.conflict(
        'Anda belum melakukan presensi masuk hari ini.',
        'CHECKOUT_WITHOUT_CHECKIN',
      );
    }
    attendanceType = 'CHECK_IN';
  } else if (existing.checkInAt && !existing.checkOutAt) {
    if (options?.requestedType === 'CHECK_IN') {
      throw AppError.conflict(
        'Anda sudah melakukan presensi masuk hari ini.',
        'DUPLICATE_CHECK_IN',
      );
    }
    attendanceType = 'CHECK_OUT';
  } else if (existing.checkInAt && existing.checkOutAt) {
    const msg =
      options?.requestedType === 'CHECK_OUT'
        ? 'Anda sudah melakukan presensi pulang hari ini.'
        : 'Presensi masuk dan pulang hari ini sudah tercatat.';
    throw AppError.conflict(msg, 'DUPLICATE_ATTENDANCE');
  } else {
    throw AppError.conflict(
      'Catatan presensi hari ini tidak mendukung check-out tanpa check-in.',
      'CHECKOUT_WITHOUT_CHECKIN',
    );
  }

  const setting = await getOrCreateAttendanceSetting();
  const checkInStartMin = parseHhMmToMinutes(setting.checkInStartTime);
  const workStartMin = parseHhMmToMinutes(setting.workStartTime);
  const lateDeadlineMin = workStartMin + setting.lateToleranceMinutes;
  const workEndMin = parseHhMmToMinutes(setting.workEndTime);
  const checkOutEndMin = parseHhMmToMinutes(setting.checkOutEndTime);

  let checkInStatus: AttendanceStatus = 'PRESENT';
  if (attendanceType === 'CHECK_IN') {
    if (wib.minutesOfDay < checkInStartMin) {
      throw AppError.badRequest(
        `Presensi masuk belum dibuka. Layanan dibuka mulai pukul ${setting.checkInStartTime} WIB.`,
        'BEFORE_ATTENDANCE_START',
      );
    }
    if (wib.minutesOfDay > workEndMin) {
      throw AppError.badRequest(
        `Batas waktu presensi masuk telah berakhir pada pukul ${setting.workEndTime} WIB.`,
        'AFTER_ATTENDANCE_END',
      );
    }
    checkInStatus = wib.minutesOfDay <= lateDeadlineMin ? 'PRESENT' : 'LATE';
  } else {
    if (wib.minutesOfDay > checkOutEndMin) {
      throw AppError.badRequest(
        `Batas waktu presensi pulang telah berakhir pada pukul ${setting.checkOutEndTime} WIB.`,
        'AFTER_ATTENDANCE_END',
      );
    }
  }

  const verification = await verifyParticipantFaceInternal(
    participant.id,
    imageBuffer,
    mimeType,
    filename,
  );

  if (!verification.matched) {
    return {
      recorded: false,
      verificationStatus: verification.status,
      message: verification.message,
    };
  }

  let savedEvidence:
    | { storageKey: string; mimeType: string; fileSizeBytes: number }
    | undefined;
  if (setting.saveEvidence) {
    savedEvidence = await savePrivateEvidenceFile(
      imageBuffer,
      mimeType,
      wib.dateStr,
    );
  }

  try {
    if (attendanceType === 'CHECK_IN') {
      const created = await createCheckInAttendance({
        participantId: participant.id,
        attendanceDate: wib.attendanceDate,
        checkInAt: now,
        status: checkInStatus,
        verificationStatus: 'VERIFIED',
        verificationScore: verification.similarityScore,
        evidence: savedEvidence,
      });

      const confirmationMessage =
        created.status === 'LATE'
          ? 'Presensi masuk berhasil dicatat dengan status Terlambat.'
          : 'Presensi masuk Anda berhasil dicatat tepat waktu.';

      return {
        recorded: true,
        verificationStatus: 'verified',
        message: confirmationMessage,
        attendance: {
          id: created.id,
          participantName: participant.fullName,
          attendanceType: 'CHECK_IN',
          attendanceDate: toDateOnlyString(created.attendanceDate),
          recordedAt: (created.checkInAt ?? now).toISOString(),
          checkInAt: created.checkInAt?.toISOString() ?? null,
          checkOutAt: created.checkOutAt?.toISOString() ?? null,
          status: created.status,
          confirmationMessage,
        },
      };
    }

    const updated = await recordCheckOutAttendance({
      attendanceId: existing!.id,
      checkOutAt: now,
      evidence: savedEvidence,
    });

    const confirmationMessage = 'Presensi pulang Anda berhasil dicatat.';
    return {
      recorded: true,
      verificationStatus: 'verified',
      message: confirmationMessage,
      attendance: {
        id: updated.id,
        participantName: participant.fullName,
        attendanceType: 'CHECK_OUT',
        attendanceDate: toDateOnlyString(updated.attendanceDate),
        recordedAt: (updated.checkOutAt ?? now).toISOString(),
        checkInAt: updated.checkInAt?.toISOString() ?? null,
        checkOutAt: updated.checkOutAt?.toISOString() ?? null,
        status: updated.status,
        confirmationMessage,
      },
    };
  } catch (error) {
    if (savedEvidence) {
      await deletePrivateEvidenceFile(savedEvidence.storageKey);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw AppError.conflict(
        'Presensi untuk hari ini sudah tercatat.',
        'DUPLICATE_ATTENDANCE',
      );
    }
    throw error;
  }
}

export async function getParticipantAttendanceHistory(
  participantId: string,
  month?: string,
) {
  const participant = await findParticipantById(participantId);
  if (!participant) {
    throw AppError.notFound('Profil peserta tidak ditemukan.');
  }

  const rows = await listParticipantAttendanceHistory(participant.id, month);
  return rows.map((row) => ({
    id: row.id,
    participantId: participant.id,
    participantName: participant.fullName,
    nimNis: participant.nimNis,
    division: participant.division,
    attendanceDate: toDateOnlyString(row.attendanceDate),
    checkInAt: row.checkInAt?.toISOString() ?? null,
    checkOutAt: row.checkOutAt?.toISOString() ?? null,
    status: row.status,
    verificationStatus: row.verificationStatus,
    isCorrected: row.isCorrected,
    notes: row.notes ?? undefined,
  }));
}
