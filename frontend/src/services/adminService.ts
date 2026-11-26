import type {
  AdminAttendanceDetailRecord,
  AdminAttendanceListResponse,
  AdminAttendanceReportResponse,
  AdminAttendanceSettingsResponse,
  AdminCorrectAttendancePayload,
  AdminParticipantDetailResponse,
  AdminParticipantsListResponse,
  AdminParticipantUpdatePayload,
  AttendanceSettingsData,
  AttendanceStatus,
  ParticipantProfile,
  ParticipantStatus,
  ReportExportFormat,
  ReportType,
} from '../types/domain.ts';
import { ApiError, apiRequest } from './apiClient.ts';

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

export interface AdminReportFilterParams {
  reportType?: ReportType;
  startDate?: string;
  endDate?: string;
  participantId?: string;
  division?: string;
  status?: 'ALL' | AttendanceStatus;
}

function buildReportQueryString(params: AdminReportFilterParams): string {
  const qs = new URLSearchParams();
  if (params.reportType) qs.set('reportType', params.reportType);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.participantId && params.participantId !== 'ALL') {
    qs.set('participantId', params.participantId);
  }
  if (params.division && params.division !== 'ALL') {
    qs.set('division', params.division);
  }
  if (params.status && params.status !== 'ALL') {
    qs.set('status', params.status);
  }
  return qs.toString();
}

export function getAdminReports(
  params: AdminReportFilterParams = {},
): Promise<AdminAttendanceReportResponse> {
  const queryString = buildReportQueryString(params);
  return apiRequest<AdminAttendanceReportResponse>(
    `/admin/reports${queryString ? `?${queryString}` : ''}`,
  );
}

export async function downloadAdminReportFile(
  params: AdminReportFilterParams,
  format: ReportExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';
  const qs = new URLSearchParams(buildReportQueryString(params));
  qs.set('format', format);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(
      `${base}/admin/reports/export?${qs.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      },
    );
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        408,
        'REQUEST_TIMEOUT',
        'Unduhan laporan melebihi batas waktu. Coba perkecil rentang tanggal atau ulangi lagi.',
      );
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server saat mengunduh laporan.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null;
    const errorCode =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'EXPORT_FAILED';
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : 'Gagal mengekspor laporan kehadiran.';
    throw new ApiError(response.status, errorCode, message);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const fallbackName = `laporan-presensi.${format}`;
  const blob = await response.blob();

  return {
    blob,
    filename: match?.[1] ?? fallbackName,
  };
}

export function getAdminSettings(): Promise<AdminAttendanceSettingsResponse> {
  return apiRequest<AdminAttendanceSettingsResponse>('/admin/settings');
}

export function updateAdminSettings(
  payload: AttendanceSettingsData,
): Promise<AdminAttendanceSettingsResponse> {
  return apiRequest<AdminAttendanceSettingsResponse>('/admin/settings', {
    method: 'PUT',
    body: payload,
  });
}
