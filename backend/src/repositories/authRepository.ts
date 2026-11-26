import { prisma } from '../lib/prisma.js';

export async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const lowerEmail = trimmed.toLowerCase();

  return prisma.user.findFirst({
    where: {
      OR: [{ email: lowerEmail }, { username: trimmed }],
    },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });
}

export async function createUserSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        userId,
        expiresAt: { lte: new Date() },
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return tx.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  });
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}
