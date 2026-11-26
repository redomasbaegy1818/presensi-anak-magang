import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  resolveSessionByToken,
  type AuthUserContext,
  type UserRole,
} from '../services/sessionService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUserContext | null;
    }
  }
}

/**
 * Populates req.authUser when a valid session cookie is present.
 * Leaves req.authUser as null for unauthenticated requests.
 */
export const attachAuthContext = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const rawCookie: unknown = req.cookies?.[env.SESSION_COOKIE_NAME];
    if (typeof rawCookie !== 'string' || !rawCookie) {
      req.authUser = null;
      next();
      return;
    }

    req.authUser = await resolveSessionByToken(rawCookie);
    next();
  },
);

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.authUser) {
    next(AppError.unauthorized());
    return;
  }
  if (!req.authUser.isActive) {
    next(AppError.forbidden('Akun Anda sedang dinonaktifkan. Hubungi admin kantor.'));
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(AppError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

const EXPECTED_APP_ORIGIN = new URL(env.APP_ORIGIN).origin;

/**
 * Mitigates CSRF on cookie-authenticated mutations by checking Fetch Metadata,
 * Origin, and fallback Referer headers against the configured APP_ORIGIN.
 */
export function requireSameOriginOnMutation(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') {
    next(AppError.forbidden('Asal permintaan lintas situs tidak diizinkan.'));
    return;
  }

  const origin = req.get('origin');
  if (origin !== undefined) {
    if (origin !== EXPECTED_APP_ORIGIN) {
      next(AppError.forbidden('Asal permintaan tidak diizinkan.'));
      return;
    }
    next();
    return;
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== EXPECTED_APP_ORIGIN) {
        next(AppError.forbidden('Referrer permintaan tidak diizinkan.'));
        return;
      }
    } catch {
      next(AppError.forbidden('Referrer permintaan tidak valid.'));
      return;
    }
  }

  next();
}
