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
