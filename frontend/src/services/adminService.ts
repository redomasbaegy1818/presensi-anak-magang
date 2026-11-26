import type {
  AdminAttendanceDetailRecord,
  AdminAttendanceListResponse,
  AdminCorrectAttendancePayload,
  AdminParticipantDetailResponse,
  AdminParticipantsListResponse,
  AdminParticipantUpdatePayload,
  ParticipantProfile,
  ParticipantStatus,
} from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

export interface AdminParticipantsFilterParams {
  search?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  division?: string;
  faceStatus?: 'ALL' | 'REGISTERED' | 'UNREGISTERED';
  page?: number;
  limit?: number;
}

export function getAdminParticipants(
  params: AdminParticipantsFilterParams = {},
): Promise<AdminParticipantsListResponse> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params.division && params.division !== 'ALL') {
    qs.set('division', params.division);
  }
  if (params.faceStatus && params.faceStatus !== 'ALL') {
    qs.set('faceStatus', params.faceStatus);
  }
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const queryString = qs.toString();
  return apiRequest<AdminParticipantsListResponse>(
    `/admin/participants${queryString ? `?${queryString}` : ''}`,
  );
}

export function getAdminParticipantDetail(
  id: string,
): Promise<AdminParticipantDetailResponse> {
  return apiRequest<AdminParticipantDetailResponse>(
    `/admin/participants/${encodeURIComponent(id)}`,
  );
}

export function updateAdminParticipant(
  id: string,
  payload: AdminParticipantUpdatePayload,
): Promise<{ participant: ParticipantProfile; message: string }> {
  return apiRequest<{ participant: ParticipantProfile; message: string }>(
    `/admin/participants/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export function updateAdminParticipantStatus(
  id: string,
  status: ParticipantStatus,
): Promise<{ participant: ParticipantProfile; message: string }> {
  return apiRequest<{ participant: ParticipantProfile; message: string }>(
    `/admin/participants/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: { status },
    },
  );
}

export interface AdminAttendanceFilterParams {
  search?: string;
  participantId?: string;
  date?: string;
  status?: 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT';
  page?: number;
  limit?: number;
}

export function getAdminAttendance(
  params: AdminAttendanceFilterParams = {},
): Promise<AdminAttendanceListResponse> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.participantId && params.participantId !== 'ALL') {
    qs.set('participantId', params.participantId);
  }
  if (params.date) qs.set('date', params.date);
  if (params.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const queryString = qs.toString();
  return apiRequest<AdminAttendanceListResponse>(
    `/admin/attendance${queryString ? `?${queryString}` : ''}`,
  );
}

export function getAdminAttendanceDetail(
  id: string,
): Promise<{ record: AdminAttendanceDetailRecord }> {
  return apiRequest<{ record: AdminAttendanceDetailRecord }>(
    `/admin/attendance/${encodeURIComponent(id)}`,
  );
}

export function correctAdminAttendance(
  id: string,
  payload: AdminCorrectAttendancePayload,
): Promise<{ record: AdminAttendanceDetailRecord; message: string }> {
  return apiRequest<{ record: AdminAttendanceDetailRecord; message: string }>(
    `/admin/attendance/${encodeURIComponent(id)}/correct`,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export function getAdminEvidenceUrl(
  attendanceId: string,
  type: 'CHECK_IN' | 'CHECK_OUT',
): string {
  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';
  return `${base}/admin/attendance/${encodeURIComponent(attendanceId)}/evidence/${type}`;
}
