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
): Promise<SessionSummary> {
  return apiRequest<SessionSummary>('/auth/admin/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export function loginParticipantRequest(
  email: string,
  password: string,
): Promise<SessionSummary> {
  return apiRequest<SessionSummary>('/auth/login', {
    method: 'POST',
    body: { email, password },
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
