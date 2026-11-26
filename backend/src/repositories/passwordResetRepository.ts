import { prisma } from '../lib/prisma.js';

export async function createPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdByAdminId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    return tx.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdByAdminId: input.createdByAdminId ?? null,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  });
}

export async function findValidPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          participant: {
            select: {
              fullName: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export async function consumePasswordResetTokenAndUpdatePassword(input: {
  tokenId: string;
  userId: string;
  newPasswordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash: input.newPasswordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: input.tokenId },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await tx.session.deleteMany({
      where: { userId: input.userId },
    });
  });
}
