import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  OFFICE_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
  DATABASE_URL: z.string().optional().default(''),
  SESSION_SECRET: z.string().optional().default(''),
  EMBEDDING_ENCRYPTION_KEY: z.string().optional().default(''),
  FACE_SERVICE_URL: z.string().url().default('http://127.0.0.1:8001'),
  FACE_SERVICE_TOKEN: z.string().optional().default(''),
  EVIDENCE_STORAGE_DIR: z.string().min(1).default('./storage/evidence'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid backend environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
