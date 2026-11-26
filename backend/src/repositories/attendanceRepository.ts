import {
  Prisma,
  type AttendanceEvidenceType,
  type AttendanceStatus,
  type VerificationStatus,
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

export interface ListAdminAttendanceFilter {
  search?: string;
  participantId?: string;
  date?: string;
  status?: 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT';
  page: number;
  limit: number;
}

export async function listAttendancesForAdmin(
  filter: ListAdminAttendanceFilter,
) {
  const where: Prisma.AttendanceWhereInput = {};

  if (filter.participantId && filter.participantId !== 'ALL') {
    where.participantId = filter.participantId;
  }

  if (filter.date) {
    where.attendanceDate = new Date(`${filter.date}T00:00:00.000Z`);
  }

  if (filter.status && filter.status !== 'ALL') {
    where.status = filter.status;
  }

  if (filter.search) {
    const q = filter.search.trim();
    if (q) {
      where.participant = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { nimNis: { contains: q, mode: 'insensitive' } },
          { division: { contains: q, mode: 'insensitive' } },
        ],
      };
    }
  }

  const skip = (filter.page - 1) * filter.limit;

  const [items, total, participantOptions] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: [{ attendanceDate: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take: filter.limit,
      select: {
        id: true,
        participantId: true,
        attendanceDate: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        verificationStatus: true,
        isCorrected: true,
        participant: {
          select: {
            fullName: true,
            nimNis: true,
            division: true,
          },
        },
        evidences: {
          select: {
            type: true,
            capturedAt: true,
          },
        },
        _count: {
          select: {
            correctionLogs: true,
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
    prisma.participant.findMany({
      select: {
        id: true,
        fullName: true,
        nimNis: true,
      },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return {
    items,
    total,
    participantOptions,
  };
}

export async function findAttendanceDetailForAdmin(id: string) {
  return prisma.attendance.findUnique({
    where: { id },
    select: {
      id: true,
      participantId: true,
      attendanceDate: true,
      checkInAt: true,
      checkOutAt: true,
      status: true,
      verificationStatus: true,
      isCorrected: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      participant: {
        select: {
          fullName: true,
          nimNis: true,
          division: true,
          status: true,
        },
      },
      evidences: {
        select: {
          id: true,
          type: true,
          capturedAt: true,
        },
      },
      correctionLogs: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          previousCheckInAt: true,
          newCheckInAt: true,
          previousCheckOutAt: true,
          newCheckOutAt: true,
          reason: true,
          createdAt: true,
          adminUser: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      },
    },
  });
}

export async function findAttendanceEvidenceStorageKey(
  attendanceId: string,
  type: AttendanceEvidenceType,
) {
  return prisma.attendanceEvidence.findUnique({
    where: {
      attendanceId_type: {
        attendanceId,
        type,
      },
    },
    select: {
      storageKey: true,
      mimeType: true,
    },
  });
}
