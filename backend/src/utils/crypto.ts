import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;

/**
 * Hashes a user password with per-password random salt using Node's built-in scrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(plainText, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored `salt:hash` string in constant time.
 */
export async function verifyPassword(
  plainText: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) {
    return false;
  }

  const expectedBuffer = Buffer.from(keyHex, 'hex');
  const derivedKey = (await scryptAsync(plainText, salt, SCRYPT_KEYLEN)) as Buffer;
  if (expectedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedKey);
}

/**
 * Generates an opaque URL-safe session token and its SHA-256 digest for DB storage.
 */
export function createSessionTokenPair(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashSessionToken(token),
  };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
