import { hashSessionToken } from '../utils/crypto.js';

export type UserRole = 'ADMIN' | 'PARTICIPANT';

export interface AuthUserContext {
  userId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Resolves an opaque session token into an authenticated user context.
 * Returns null until database session tables and auth routes are implemented.
 */
export async function resolveSessionByToken(
  token: string,
): Promise<AuthUserContext | null> {
  const tokenDigest = hashSessionToken(token);
  if (!tokenDigest) {
    return null;
  }
  return null;
}

export function buildSessionSummary(user: AuthUserContext | null | undefined) {
  return {
    authenticated: Boolean(user),
    user: user ?? null,
  };
}
