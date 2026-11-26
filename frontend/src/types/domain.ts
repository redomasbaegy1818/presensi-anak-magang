export type UserRole = 'ADMIN' | 'PARTICIPANT';

export type ParticipantStatus = 'ACTIVE' | 'INACTIVE';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'MANUAL_OVERRIDE';

export type AttendanceActionType = 'CHECK_IN' | 'CHECK_OUT';

export interface ParticipantProfile {
  id: string;
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  email: string;
  internshipStartDate: string;
  internshipEndDate: string;
  status: ParticipantStatus;
  faceRegistered: boolean;
  faceRegisteredAt: string | null;
}

export interface AttendanceRecordItem {
  id: string;
  participantId: string;
  participantName: string;
  nimNis: string;
  division: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  verificationStatus: VerificationStatus;
  isCorrected: boolean;
  notes?: string;
}

export interface AttendanceSettingsData {
  checkInStartTime: string;
  workStartTime: string;
  lateToleranceMinutes: number;
  workEndTime: string;
  checkOutEndTime: string;
  saveEvidence: boolean;
}

export interface ApiHealthStatus {
  status: string;
  service: string;
  timezone: string;
  database: 'connected' | 'not_configured' | 'disconnected';
  faceService: 'connected' | 'unreachable';
  timestamp: string;
}
