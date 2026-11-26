import { env } from '../config/env.js';
import {
  createUserSession,
  deleteSessionByTokenHash,
  findUserByIdentifier,
} from '../repositories/authRepository.js';
import { AppError } from '../utils/appError.js';
import {
  createSessionTokenPair,
  hashSessionToken,
  verifyPassword,
} from '../utils/crypto.js';
import type { AuthUserContext } from './sessionService.js';

// Pre-computed dummy scrypt hash to keep response timing consistent when user is not found.
const DUMMY_PASSWORD_HASH =
  '00112233445566778899aabbccddeeff:' + '00'.repeat(64);

export async function loginAdmin(
  identifier: string,
  password: string,
): Promise<{ token: string; user: AuthUserContext }> {
  const user = await findUserByIdentifier(identifier);
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyPassword(password, hashToVerify);

  if (!user || !passwordValid || user.role !== 'ADMIN') {
    throw AppError.unauthorized('Email/username atau kata sandi tidak sesuai.');
  }

  if (!user.isActive) {
    throw AppError.forbidden(
      'Akun admin Anda sedang dinonaktifkan. Hubungi administrator sistem.',
    );
  }

  const { token, tokenHash } = createSessionTokenPair();
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  );

  await createUserSession(user.id, tokenHash, expiresAt);

  return {
    token,
    user: {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    },
  };
}

export async function logoutByToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await deleteSessionByTokenHash(tokenHash);
}
