import type { ParticipantStatus, UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashSessionToken } from '../utils/crypto.js';

export type { UserRole };

export interface AuthParticipantSummary {
  id: string;
  fullName: string;
  nimNis: string;
  division: string;
  status: ParticipantStatus;
  faceRegistered: boolean;
}

export interface AuthUserContext {
  userId: string;
  email: string;
  username: string | null;
  role: UserRole;
  isActive: boolean;
  participant: AuthParticipantSummary | null;
}

/**
 * Resolves an opaque session token into an authenticated user context via PostgreSQL.
 * Returns null cleanly if DATABASE_URL is not configured or the session is missing/expired.
 */
export async function resolveSessionByToken(
  token: string,
): Promise<AuthUserContext | null> {
  if (!env.DATABASE_URL || env.DATABASE_URL.includes('CHANGE_ME')) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
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
                id: true,
                fullName: true,
                nimNis: true,
                division: true,
                status: true,
                faceTemplate: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    const p = session.user.participant;

    return {
      userId: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
      isActive: session.user.isActive,
      participant: p
        ? {
            id: p.id,
            fullName: p.fullName,
            nimNis: p.nimNis,
            division: p.division,
            status: p.status,
            faceRegistered: Boolean(p.faceTemplate),
          }
        : null,
    };
  } catch {
    return null;
  }
}

export function buildSessionSummary(user: AuthUserContext | null | undefined) {
  return {
    authenticated: Boolean(user),
    user: user ?? null,
  };
}
