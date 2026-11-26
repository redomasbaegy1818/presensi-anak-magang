import type {
  AdminOverviewResponse,
  ParticipantProfile,
  ParticipantRegisterResponse,
  ParticipantRegistrationPayload,
  SessionSummary,
} from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

export function getAuthSession(): Promise<SessionSummary> {
  return apiRequest<SessionSummary>('/auth/session');
}

export function loginAdminRequest(
  identifier: string,
  password: string,
  rememberMe: boolean = false,
): Promise<SessionSummary> {
  return apiRequest<SessionSummary>('/auth/admin/login', {
    method: 'POST',
    body: { identifier, password, rememberMe },
  });
}

export function loginParticipantRequest(
  email: string,
  password: string,
  rememberMe: boolean = false,
): Promise<SessionSummary> {
  return apiRequest<SessionSummary>('/auth/login', {
    method: 'POST',
    body: { email, password, rememberMe },
  });
}

export function registerParticipantRequest(
  payload: ParticipantRegistrationPayload,
): Promise<ParticipantRegisterResponse> {
  return apiRequest<ParticipantRegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function logoutRequest(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export function getAdminOverview(): Promise<AdminOverviewResponse> {
  return apiRequest<AdminOverviewResponse>('/admin/overview');
}

export function getParticipantProfile(): Promise<{ profile: ParticipantProfile }> {
  return apiRequest<{ profile: ParticipantProfile }>('/participant/profile');
}

export function forgotPasswordRequest(
  identifier: string,
  portal: 'PARTICIPANT' | 'ADMIN',
): Promise<{ smtpConfigured: boolean; message: string }> {
  return apiRequest<{ smtpConfigured: boolean; message: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: { identifier, portal },
    },
  );
}

export function verifyResetTokenRequest(token: string): Promise<{
  valid: boolean;
  portal: 'PARTICIPANT' | 'ADMIN';
  accountLabel: string;
  expiresAt: string;
}> {
  return apiRequest<{
    valid: boolean;
    portal: 'PARTICIPANT' | 'ADMIN';
    accountLabel: string;
    expiresAt: string;
  }>(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
}

export function resetPasswordRequest(
  token: string,
  password: string,
): Promise<{ portal: 'PARTICIPANT' | 'ADMIN'; message: string }> {
  return apiRequest<{ portal: 'PARTICIPANT' | 'ADMIN'; message: string }>(
    '/auth/reset-password',
    {
      method: 'POST',
      body: { token, password },
    },
  );
}
