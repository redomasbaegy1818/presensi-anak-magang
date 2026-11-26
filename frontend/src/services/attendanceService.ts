import type {
  AttendanceActionType,
  AttendanceMarkResponse,
  AttendanceRecordItem,
  TodayAttendanceSummary,
} from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

export function getTodayAttendance(): Promise<TodayAttendanceSummary> {
  return apiRequest<TodayAttendanceSummary>('/participant/attendance/today');
}

export function markAttendanceFrame(
  imageBlob: Blob,
  type?: AttendanceActionType,
): Promise<AttendanceMarkResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'frame.jpg');
  if (type) {
    formData.append('type', type);
  }

  return apiRequest<AttendanceMarkResponse>('/participant/attendance/mark', {
    method: 'POST',
    body: formData,
  });
}

export function getParticipantAttendanceHistory(
  month?: string,
): Promise<{ records: AttendanceRecordItem[] }> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiRequest<{ records: AttendanceRecordItem[] }>(
    `/participant/attendance/history${query}`,
  );
}
