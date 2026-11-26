import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const RATE_LIMIT_BODY = {
  error: 'RATE_LIMIT_EXCEEDED',
  message: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.',
};

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: RATE_LIMIT_BODY,
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: RATE_LIMIT_BODY,
});
