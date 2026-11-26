export type UserRole = 'ADMIN' | 'PARTICIPANT';

export interface AuthParticipantSummary {
  id: string;
  fullName: string;
  nimNis: string;
  division: string;
  status: ParticipantStatus;
  faceRegistered: boolean;
}

export interface AuthUser {
  userId: string;
  email: string;
  username: string | null;
  role: UserRole;
  isActive: boolean;
  participant: AuthParticipantSummary | null;
}

export interface ParticipantRegistrationPayload {
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  email: string;
  internshipStartDate: string;
  internshipEndDate: string;
  password: string;
}

export interface ParticipantRegisterResponse {
  authenticated: boolean;
  user: AuthUser;
  participant: ParticipantProfile;
  message: string;
}

export interface SessionSummary {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface AdminOverviewResponse {
  admin: AuthUser;
  timezone: string;
  summary: {
    activeParticipants: number;
    presentToday: number;
    lateToday: number;
    notCheckedInToday: number;
  };
  checkedAt: string;
}

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

export type FaceDetectionStatus =
  | 'face_detected'
  | 'no_face'
  | 'multiple_faces'
  | 'low_quality';

export type FaceDetectionReason =
  | 'ok'
  | 'no_face'
  | 'multiple_faces'
  | 'low_confidence'
  | 'face_too_small'
  | 'face_too_close'
  | 'partial_face'
  | 'poor_lighting'
  | 'blurry_image';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  status: FaceDetectionStatus;
  reason: FaceDetectionReason;
  faceCount: number;
  bbox: FaceBoundingBox | null;
  message: string;
}
