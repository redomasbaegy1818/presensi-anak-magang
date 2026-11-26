import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/**
 * Logs concise HTTP method, path, status code, and latency without printing
 * request bodies, cookies, headers, or sensitive biometric/credential fields.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)} ms)`,
    );
  });

  next();
}
