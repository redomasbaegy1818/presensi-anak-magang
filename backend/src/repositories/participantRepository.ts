import { Prisma, type ParticipantStatus, type UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeNimNis(nimNis: string): string {
  return nimNis.trim().toUpperCase();
}

export const PUBLIC_PARTICIPANT_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  nimNis: true,
  universitySchool: true,
  major: true,
  division: true,
  phone: true,
  internshipStartDate: true,
  internshipEndDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      email: true,
      isActive: true,
    },
  },
  faceTemplate: {
    select: {
      registeredAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ParticipantSelect;

export interface CreateParticipantInput {
  email: string;
  passwordHash: string;
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  internshipStartDate: Date;
  internshipEndDate: Date;
}

export async function createParticipantWithUser(input: CreateParticipantInput) {
  const email = normalizeEmail(input.email);
  const nimNis = normalizeNimNis(input.nimNis);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        role: 'PARTICIPANT' satisfies UserRole,
        isActive: true,
      },
    });

    return tx.participant.create({
      data: {
        userId: user.id,
        fullName: input.fullName.trim(),
        nimNis,
        universitySchool: input.universitySchool.trim(),
        major: input.major.trim(),
        division: input.division.trim(),
        phone: input.phone.trim(),
        internshipStartDate: input.internshipStartDate,
        internshipEndDate: input.internshipEndDate,
        status: 'ACTIVE',
      },
      select: PUBLIC_PARTICIPANT_SELECT,
    });
  });
}

export async function findParticipantById(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    select: PUBLIC_PARTICIPANT_SELECT,
  });
}

export async function findParticipantByUserId(userId: string) {
  return prisma.participant.findUnique({
    where: { userId },
    select: PUBLIC_PARTICIPANT_SELECT,
  });
}

export async function findDuplicateParticipantConflicts(
  email: string,
  nimNis: string,
  exclude?: { participantId: string; userId: string },
): Promise<{ emailExists: boolean; nimNisExists: boolean }> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedNimNis = normalizeNimNis(nimNis);

  const [existingUser, existingParticipant] = await Promise.all([
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    }),
    prisma.participant.findUnique({
      where: { nimNis: normalizedNimNis },
      select: { id: true },
    }),
  ]);

  return {
    emailExists: Boolean(
      existingUser && (!exclude || existingUser.id !== exclude.userId),
    ),
    nimNisExists: Boolean(
      existingParticipant &&
        (!exclude || existingParticipant.id !== exclude.participantId),
    ),
  };
}

export interface ListParticipantsFilter {
  search?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  division?: string;
  faceStatus?: 'ALL' | 'REGISTERED' | 'UNREGISTERED';
  page: number;
  limit: number;
}

export async function listParticipantsForAdmin(filter: ListParticipantsFilter) {
  const where: Prisma.ParticipantWhereInput = {};

  if (filter.status && filter.status !== 'ALL') {
    where.status = filter.status;
  }

  if (filter.division && filter.division !== 'ALL') {
    where.division = filter.division;
  }

  if (filter.faceStatus === 'REGISTERED') {
    where.faceTemplate = { isNot: null };
  } else if (filter.faceStatus === 'UNREGISTERED') {
    where.faceTemplate = { is: null };
  }

  if (filter.search) {
    const q = filter.search.trim();
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { nimNis: { contains: q, mode: 'insensitive' } },
        { universitySchool: { contains: q, mode: 'insensitive' } },
        { major: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }
  }

  const skip = (filter.page - 1) * filter.limit;

  const [items, total, divisionRows] = await Promise.all([
    prisma.participant.findMany({
      where,
      select: PUBLIC_PARTICIPANT_SELECT,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      skip,
      take: filter.limit,
    }),
    prisma.participant.count({ where }),
    prisma.participant.findMany({
      distinct: ['division'],
      select: { division: true },
      orderBy: { division: 'asc' },
    }),
  ]);

  return {
    items,
    total,
    divisions: divisionRows.map((d) => d.division),
  };
}

export async function findParticipantDetailForAdmin(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    select: {
      ...PUBLIC_PARTICIPANT_SELECT,
      attendances: {
        orderBy: { attendanceDate: 'desc' },
        take: 15,
        select: {
          id: true,
          attendanceDate: true,
          checkInAt: true,
          checkOutAt: true,
          status: true,
          verificationStatus: true,
          isCorrected: true,
        },
      },
    },
  });
}

export interface UpdateParticipantInfoInput {
  participantId: string;
  userId: string;
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  email: string;
  internshipStartDate: Date;
  internshipEndDate: Date;
}

export async function updateParticipantInfo(input: UpdateParticipantInfoInput) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { email: normalizeEmail(input.email) },
    });

    return tx.participant.update({
      where: { id: input.participantId },
      data: {
        fullName: input.fullName.trim(),
        nimNis: normalizeNimNis(input.nimNis),
        universitySchool: input.universitySchool.trim(),
        major: input.major.trim(),
        division: input.division.trim(),
        phone: input.phone.trim(),
        internshipStartDate: input.internshipStartDate,
        internshipEndDate: input.internshipEndDate,
      },
      select: PUBLIC_PARTICIPANT_SELECT,
    });
  });
}

export async function updateParticipantStatus(
  participantId: string,
  status: ParticipantStatus,
) {
  return prisma.$transaction(async (tx) => {
    const participant = await tx.participant.update({
      where: { id: participantId },
      data: { status },
      select: PUBLIC_PARTICIPANT_SELECT,
    });

    const isActive = status === 'ACTIVE';
    await tx.user.update({
      where: { id: participant.userId },
      data: { isActive },
    });

    if (!isActive) {
      await tx.session.deleteMany({
        where: { userId: participant.userId },
      });
    }

    return participant;
  });
}
