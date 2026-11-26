import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  loginAdmin,
  loginParticipant,
  logoutByToken,
  registerParticipant,
} from '../services/authService.js';
import { buildSessionSummary } from '../services/sessionService.js';
import { clearSessionCookie, setSessionCookie } from '../utils/cookies.js';
import type {
  AdminLoginInput,
  ParticipantLoginInput,
  ParticipantRegisterInput,
} from '../validation/authSchemas.js';

export function handleGetSession(req: Request, res: Response): void {
  res.status(200).json(buildSessionSummary(req.authUser));
}

export async function handleAdminLogin(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body as AdminLoginInput;
  const { token, user } = await loginAdmin(identifier, password);

  setSessionCookie(res, token);
  res.status(200).json({
    authenticated: true,
    user,
  });
}

export async function handleParticipantLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password } = req.body as ParticipantLoginInput;
  const { token, user } = await loginParticipant(email, password);

  setSessionCookie(res, token);
  res.status(200).json({
    authenticated: true,
    user,
  });
}

export async function handleParticipantRegister(
  req: Request,
  res: Response,
): Promise<void> {
  const payload = req.body as ParticipantRegisterInput;
  const { token, user, participant } = await registerParticipant(payload);

  setSessionCookie(res, token);
  res.status(201).json({
    authenticated: true,
    user,
    participant,
    message: 'Pendaftaran peserta berhasil. Silakan lanjutkan pendaftaran wajah.',
  });
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const rawCookie: unknown = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (typeof rawCookie === 'string' && rawCookie) {
    await logoutByToken(rawCookie);
  }

  clearSessionCookie(res);
  res.status(200).json({
    message: 'Anda telah keluar dari sistem.',
  });
}
