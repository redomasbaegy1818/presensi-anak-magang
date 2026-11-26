import type {
  AttendanceEvidenceType,
  AttendanceStatus,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface RecordCheckInInput {
  participantId: string;
  attendanceDate: Date;
  checkInAt: Date;
  status: AttendanceStatus;
  verificationStatus: VerificationStatus;
  verificationScore?: number | null;
  evidence?: {
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
  };
}

export async function findParticipantAttendanceByDate(
  participantId: string,
  attendanceDate: Date,
) {
  return prisma.attendance.findUnique({
    where: {
      participantId_attendanceDate: {
        participantId,
        attendanceDate,
      },
    },
    select: {
      id: true,
      participantId: true,
      attendanceDate: true,
      checkInAt: true,
      checkOutAt: true,
      status: true,
      verificationStatus: true,
      isCorrected: true,
    },
  });
}

export async function createCheckInAttendance(input: RecordCheckInInput) {
  return prisma.attendance.create({
    data: {
      participantId: input.participantId,
      attendanceDate: input.attendanceDate,
      checkInAt: input.checkInAt,
      status: input.status,
      verificationStatus: input.verificationStatus,
      verificationScore: input.verificationScore ?? null,
      evidences: input.evidence
        ? {
            create: {
              type: 'CHECK_IN' satisfies AttendanceEvidenceType,
              storageKey: input.evidence.storageKey,
              mimeType: input.evidence.mimeType,
              fileSizeBytes: input.evidence.fileSizeBytes,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      attendanceDate: true,
      checkInAt: true,
      checkOutAt: true,
      status: true,
      verificationStatus: true,
      isCorrected: true,
    },
  });
}

export interface RecordCheckOutInput {
  attendanceId: string;
  checkOutAt: Date;
  evidence?: {
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
  };
}

export async function recordCheckOutAttendance(input: RecordCheckOutInput) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendance.update({
      where: { id: input.attendanceId },
      data: {
        checkOutAt: input.checkOutAt,
      },
      select: {
        id: true,
        attendanceDate: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        verificationStatus: true,
        isCorrected: true,
      },
    });

    if (input.evidence) {
      await tx.attendanceEvidence.upsert({
        where: {
          attendanceId_type: {
            attendanceId: input.attendanceId,
            type: 'CHECK_OUT' satisfies AttendanceEvidenceType,
          },
        },
        create: {
          attendanceId: input.attendanceId,
          type: 'CHECK_OUT' satisfies AttendanceEvidenceType,
          storageKey: input.evidence.storageKey,
          mimeType: input.evidence.mimeType,
          fileSizeBytes: input.evidence.fileSizeBytes,
        },
        update: {
          storageKey: input.evidence.storageKey,
          mimeType: input.evidence.mimeType,
          fileSizeBytes: input.evidence.fileSizeBytes,
        },
      });
    }

    return updated;
  });
}

export async function listParticipantAttendanceHistory(
  participantId: string,
  month?: string,
) {
  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (month) {
    const [yStr, mStr] = month.split('-');
    const year = Number(yStr);
    const monthNum = Number(mStr);
    if (Number.isInteger(year) && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const start = new Date(Date.UTC(year, monthNum - 1, 1));
      const end = new Date(Date.UTC(year, monthNum, 1));
      dateFilter = { gte: start, lt: end };
    }
  }

  return prisma.attendance.findMany({
    where: {
      participantId,
      ...(dateFilter ? { attendanceDate: dateFilter } : {}),
    },
    orderBy: { attendanceDate: 'desc' },
    take: 60,
    select: {
      id: true,
      attendanceDate: true,
      checkInAt: true,
      checkOutAt: true,
      status: true,
      verificationStatus: true,
      isCorrected: true,
      notes: true,
    },
  });
}

export interface CorrectAttendanceInput {
  attendanceId: string;
  adminUserId: string;
  newStatus: AttendanceStatus;
  newCheckInAt?: Date | null;
  newCheckOutAt?: Date | null;
  reason: string;
}

export async function correctAttendanceWithAudit(
  input: CorrectAttendanceInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.attendance.findUniqueOrThrow({
      where: { id: input.attendanceId },
    });

    const nextCheckInAt =
      input.newCheckInAt === undefined ? existing.checkInAt : input.newCheckInAt;
    const nextCheckOutAt =
      input.newCheckOutAt === undefined
        ? existing.checkOutAt
        : input.newCheckOutAt;

    const updated = await tx.attendance.update({
      where: { id: existing.id },
      data: {
        status: input.newStatus,
        checkInAt: nextCheckInAt,
        checkOutAt: nextCheckOutAt,
        verificationStatus: 'MANUAL_OVERRIDE',
        isCorrected: true,
      },
    });

    await tx.attendanceCorrectionLog.create({
      data: {
        attendanceId: existing.id,
        adminUserId: input.adminUserId,
        previousStatus: existing.status,
        newStatus: input.newStatus,
        previousCheckInAt: existing.checkInAt,
        newCheckInAt: nextCheckInAt,
        previousCheckOutAt: existing.checkOutAt,
        newCheckOutAt: nextCheckOutAt,
        reason: input.reason.trim(),
      },
    });

    return updated;
  });
}
