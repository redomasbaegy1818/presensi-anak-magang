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
    emailExists: Boolean(existingUser),
    nimNisExists: Boolean(existingParticipant),
  };
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
