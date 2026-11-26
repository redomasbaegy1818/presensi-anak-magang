import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { env } from '../config/env.js';
import { AppError } from './appError.js';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;
const EPHEMERAL_FALLBACK_SESSION_SECRET = randomBytes(32).toString('hex');

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
 * Generates an opaque URL-safe session token and its keyed HMAC-SHA256 digest for DB storage.
 */
export function createSessionTokenPair(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashSessionToken(token),
  };
}

export function hashSessionToken(token: string): string {
  const key = env.SESSION_SECRET || EPHEMERAL_FALLBACK_SESSION_SECRET;
  return createHmac('sha256', key).update(token, 'utf8').digest('hex');
}

export function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function getEmbeddingEncryptionKey(): Buffer {
  const hexKey = env.EMBEDDING_ENCRYPTION_KEY;
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey) || hexKey.includes('REPLACE_WITH')) {
    throw new AppError(
      500,
      'EMBEDDING_KEY_NOT_CONFIGURED',
      'Kunci enkripsi data wajah belum dikonfigurasi pada server.',
    );
  }
  return Buffer.from(hexKey, 'hex');
}

export interface EncryptedEmbeddingPayload {
  encryptedEmbedding: string;
  encryptionIv: string;
  encryptionAuthTag: string;
}

/**
 * Encrypts a float32 face embedding vector using AES-256-GCM.
 */
export function encryptEmbedding(vector: number[]): EncryptedEmbeddingPayload {
  const key = getEmbeddingEncryptionKey();
  const iv = randomBytes(12);
  const floatBuf = Buffer.from(Float32Array.from(vector).buffer);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(floatBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedEmbedding: encrypted.toString('base64'),
    encryptionIv: iv.toString('hex'),
    encryptionAuthTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted face embedding back into float numbers.
 */
export function decryptEmbedding(
  encryptedEmbedding: string,
  encryptionIv: string,
  encryptionAuthTag: string,
): number[] {
  const key = getEmbeddingEncryptionKey();
  const iv = Buffer.from(encryptionIv, 'hex');
  const authTag = Buffer.from(encryptionAuthTag, 'hex');
  const ciphertext = Buffer.from(encryptedEmbedding, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  if (decrypted.byteLength % 4 !== 0) {
    throw new Error('Invalid decrypted embedding byte length.');
  }

  const floatView = new Float32Array(
    decrypted.buffer,
    decrypted.byteOffset,
    decrypted.byteLength / 4,
  );
  return Array.from(floatView);
}

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12) {
    return -1;
  }
  return dot / denom;
}
