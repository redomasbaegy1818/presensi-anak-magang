import {
  Prisma,
  type PermissionStatus,
  type PermissionType,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const PERMISSION_SELECT = {
  id: true,
  participantId: true,
  type: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  adminNote: true,
  reviewedAt: true,
  createdAt: true,
  participant: {
    select: {
      fullName: true,
      nimNis: true,
      division: true,
    },
  },
  reviewedBy: {
    select: {
      username: true,
      email: true,
    },
  },
} satisfies Prisma.PermissionRequestSelect;

export async function findOverlappingPermission(
  participantId: string,
  startDate: Date,
  endDate: Date,
) {
  return prisma.permissionRequest.findFirst({
    where: {
      participantId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function findPermissionCoveringDate(
  participantId: string,
  date: Date,
  statuses: PermissionStatus[] = ['PENDING', 'APPROVED'],
) {
  return prisma.permissionRequest.findFirst({
    where: {
      participantId,
      status: { in: statuses },
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      reason: true,
      adminNote: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function createPermissionRequest(input: {
  participantId: string;
  type: PermissionType;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  return prisma.permissionRequest.create({
    data: {
      participantId: input.participantId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason.trim(),
      status: 'PENDING',
    },
    select: PERMISSION_SELECT,
  });
}

export async function listPermissionsForParticipant(participantId: string) {
  return prisma.permissionRequest.findMany({
    where: { participantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: PERMISSION_SELECT,
  });
}

export interface ListAdminPermissionsFilter {
  search?: string;
  status: 'ALL' | PermissionStatus;
  type: 'ALL' | PermissionType;
  date?: string;
  page: number;
  limit: number;
}

export async function listPermissionsForAdmin(
  filter: ListAdminPermissionsFilter,
) {
  const where: Prisma.PermissionRequestWhereInput = {};

  if (filter.status !== 'ALL') {
    where.status = filter.status;
  }
  if (filter.type !== 'ALL') {
    where.type = filter.type;
  }
  if (filter.date) {
    const targetDate = new Date(`${filter.date}T00:00:00.000Z`);
    where.startDate = { lte: targetDate };
    where.endDate = { gte: targetDate };
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

  const [items, total, pendingCount] = await Promise.all([
    prisma.permissionRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: filter.limit,
      select: PERMISSION_SELECT,
    }),
    prisma.permissionRequest.count({ where }),
    prisma.permissionRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    items,
    total,
    pendingCount,
  };
}

export async function findPermissionById(id: string) {
  return prisma.permissionRequest.findUnique({
    where: { id },
    select: PERMISSION_SELECT,
  });
}

function enumerateDateRangeUtc(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let cursor = startDate.getTime();
  const endMs = endDate.getTime();
  while (cursor <= endMs) {
    dates.push(new Date(cursor));
    cursor += 86_400_000;
  }
  return dates;
}

export async function reviewPermissionWithAttendanceSync(input: {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  adminNote?: string;
  adminUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.permissionRequest.findUnique({
      where: { id: input.id },
      select: PERMISSION_SELECT,
    });
    if (!existing) {
      return null;
    }

    const updated = await tx.permissionRequest.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        adminNote: input.adminNote?.trim() || null,
        reviewedById: input.adminUserId,
        reviewedAt: new Date(),
      },
      select: PERMISSION_SELECT,
    });

    if (input.status === 'APPROVED') {
      const dates = enumerateDateRangeUtc(existing.startDate, existing.endDate);
      const label = existing.type === 'SAKIT' ? 'Sakit Disetujui' : 'Izin Disetujui';
      const noteText = `${label}: ${existing.reason}`;

      for (const day of dates) {
        const existingAttendance = await tx.attendance.findUnique({
          where: {
            participantId_attendanceDate: {
              participantId: existing.participantId,
              attendanceDate: day,
            },
          },
          select: { id: true, checkInAt: true },
        });

        if (!existingAttendance) {
          await tx.attendance.create({
            data: {
              participantId: existing.participantId,
              attendanceDate: day,
              status: 'ABSENT',
              verificationStatus: 'MANUAL_OVERRIDE',
              isCorrected: false,
              notes: noteText,
            },
          });
        } else if (!existingAttendance.checkInAt) {
          await tx.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status: 'ABSENT',
              notes: noteText,
            },
          });
        }
      }
    }

    return updated;
  });
}
