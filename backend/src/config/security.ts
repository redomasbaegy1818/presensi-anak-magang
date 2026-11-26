import type { CorsOptions } from 'cors';
import type { HelmetOptions } from 'helmet';
import { env } from '../config/env.js';

export const corsOptions: CorsOptions = {
  origin: env.APP_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
};

export const helmetOptions: HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'same-site' },
};
