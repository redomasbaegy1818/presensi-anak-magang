import type { Request, Response } from 'express';
import { buildSessionSummary } from '../services/sessionService.js';
import { clearSessionCookie } from '../utils/cookies.js';

export function handleGetSession(req: Request, res: Response): void {
  res.status(200).json(buildSessionSummary(req.authUser));
}

export function handleLogout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(200).json({
    message: 'Sesi berhasil diakhiri.',
  });
}
