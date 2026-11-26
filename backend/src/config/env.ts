import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
});

const PLACEHOLDER_MARKERS = ['CHANGE_ME', 'REPLACE_WITH'];

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_ORIGIN: z.string().url().default('http://localhost:5173'),
    OFFICE_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
    DATABASE_URL: z.string().optional().default(''),
    SESSION_SECRET: z.string().optional().default(''),
    SESSION_COOKIE_NAME: z.string().min(1).default('mp_session'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
    EMBEDDING_ENCRYPTION_KEY: z.string().optional().default(''),
    FACE_SERVICE_URL: z.string().url().default('http://127.0.0.1:8001'),
    FACE_SERVICE_TOKEN: z.string().optional().default(''),
    EVIDENCE_STORAGE_DIR: z.string().min(1).default('./storage/evidence'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.DATABASE_URL || hasPlaceholder(data.DATABASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL wajib diisi dengan kredensial valid pada mode produksi.',
        });
      }
      if (data.SESSION_SECRET.length < 32 || hasPlaceholder(data.SESSION_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET minimal 32 karakter dan bukan nilai contoh.',
        });
      }
      if (
        !/^[0-9a-fA-F]{64}$/.test(data.EMBEDDING_ENCRYPTION_KEY) ||
        hasPlaceholder(data.EMBEDDING_ENCRYPTION_KEY)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['EMBEDDING_ENCRYPTION_KEY'],
          message: 'EMBEDDING_ENCRYPTION_KEY harus berupa 64 karakter hex (32 byte).',
        });
      }
      if (data.FACE_SERVICE_TOKEN.length < 16 || hasPlaceholder(data.FACE_SERVICE_TOKEN)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FACE_SERVICE_TOKEN'],
          message: 'FACE_SERVICE_TOKEN minimal 16 karakter pada mode produksi.',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Konfigurasi environment backend tidak valid:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
