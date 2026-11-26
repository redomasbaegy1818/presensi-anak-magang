import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const PRISMA_UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint tidak ditemukan.',
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Data permintaan tidak valid.',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Format JSON pada permintaan tidak valid.',
    });
    return;
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError &&
      PRISMA_UNAVAILABLE_CODES.has(err.code))
  ) {
    res.status(503).json({
      error: 'DATABASE_UNAVAILABLE',
      message:
        'Layanan basis data sedang tidak tersedia. Silakan coba beberapa saat lagi.',
    });
    return;
  }

  if (env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan pada server.',
  });
}
