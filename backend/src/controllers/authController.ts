import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  confirmPasswordReset,
  loginAdmin,
  loginParticipant,
  logoutByToken,
  registerParticipant,
  requestPasswordReset,
  verifyPasswordResetToken,
} from '../services/authService.js';
import { buildSessionSummary } from '../services/sessionService.js';
import { clearSessionCookie, setSessionCookie } from '../utils/cookies.js';
import type {
  AdminLoginInput,
  ForgotPasswordInput,
  ParticipantLoginInput,
  ParticipantRegisterInput,
  ResetPasswordInput,
} from '../validation/authSchemas.js';

export function handleGetSession(req: Request, res: Response): void {
  res.status(200).json(buildSessionSummary(req.authUser));
}

export async function handleAdminLogin(req: Request, res: Response): Promise<void> {
  const { identifier, password, rememberMe } = req.body as AdminLoginInput;
  const { token, ttlHours, user } = await loginAdmin(
    identifier,
    password,
    rememberMe,
  );

  setSessionCookie(res, token, ttlHours);
  res.status(200).json({
    authenticated: true,
    user,
  });
}

export async function handleParticipantLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password, rememberMe } = req.body as ParticipantLoginInput;
  const { token, ttlHours, user } = await loginParticipant(
    email,
    password,
    rememberMe,
  );

  setSessionCookie(res, token, ttlHours);
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

export async function handleForgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { identifier, portal } = req.body as ForgotPasswordInput;
  const result = await requestPasswordReset(identifier, portal);
  res.status(200).json(result);
}

export async function handleVerifyResetToken(
  req: Request,
  res: Response,
): Promise<void> {
  const token = String((req.query as { token?: string }).token ?? '');
  const result = await verifyPasswordResetToken(token);
  res.status(200).json(result);
}

export async function handleResetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { token, password } = req.body as ResetPasswordInput;
  const result = await confirmPasswordReset(token, password);
  clearSessionCookie(res);
  res.status(200).json(result);
}
