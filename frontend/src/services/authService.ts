import type {
  AdminOverviewResponse,
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

export function logoutRequest(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export function getAdminOverview(): Promise<AdminOverviewResponse> {
  return apiRequest<AdminOverviewResponse>('/admin/overview');
}
