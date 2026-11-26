import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

export function getSessionCookieOptions(
  ttlHours: number = env.SESSION_TTL_HOURS,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: ttlHours * 60 * 60 * 1000,
  };
}

export function setSessionCookie(
  res: Response,
  token: string,
  ttlHours: number = env.SESSION_TTL_HOURS,
): void {
  res.cookie(env.SESSION_COOKIE_NAME, token, getSessionCookieOptions(ttlHours));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
