import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashSessionToken } from '../utils/crypto.js';

export type { UserRole };

export interface AuthUserContext {
  userId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
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
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      isActive: session.user.isActive,
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
