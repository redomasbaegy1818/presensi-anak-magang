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
  attendanceDate: string;
  rules: {
    checkInStartTime: string;
    workStartTime: string;
    lateToleranceMinutes: number;
    workEndTime: string;
    checkOutEndTime: string;
  };
  summary: {
    activeParticipants: number;
    attendedToday: number;
    presentToday: number;
    lateToday: number;
    notCheckedInToday: number;
    checkedOutToday: number;
  };
  recentAttendance: AttendanceRecordItem[];
  checkedAt: string;
}

export interface AdminParticipantsListResponse {
  participants: ParticipantProfile[];
  total: number;
  page: number;
  limit: number;
  divisions: string[];
}

export interface AdminParticipantDetailResponse {
  participant: ParticipantProfile;
  recentAttendances: AttendanceRecordItem[];
}

export interface AdminParticipantUpdatePayload {
  fullName: string;
  nimNis: string;
  universitySchool: string;
  major: string;
  division: string;
  phone: string;
  email: string;
  internshipStartDate: string;
  internshipEndDate: string;
}

export interface AdminAttendanceListItem extends AttendanceRecordItem {
  correctionCount: number;
  hasCheckInEvidence: boolean;
  hasCheckOutEvidence: boolean;
}

export interface AdminAttendanceListResponse {
  records: AdminAttendanceListItem[];
  total: number;
  page: number;
  limit: number;
  participantOptions: {
    id: string;
    fullName: string;
    nimNis: string;
  }[];
}

export interface AdminAttendanceCorrectionLog {
  id: string;
  previousStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  previousCheckInAt: string | null;
  newCheckInAt: string | null;
  previousCheckOutAt: string | null;
  newCheckOutAt: string | null;
  reason: string;
  createdAt: string;
  adminLabel: string;
}

export interface AdminAttendanceDetailRecord {
  id: string;
  participantId: string;
  participantName: string;
  nimNis: string;
  division: string;
  participantStatus: ParticipantStatus;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  verificationStatus: VerificationStatus;
  isCorrected: boolean;
  notes: string | null;
  evidences: {
    id: string;
    type: 'CHECK_IN' | 'CHECK_OUT';
    capturedAt: string;
  }[];
  correctionLogs: AdminAttendanceCorrectionLog[];
}

export interface AdminCorrectAttendancePayload {
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  reason: string;
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

export interface FaceRegistrationResult {
  registered: boolean;
  status: 'registered' | 'no_face' | 'multiple_faces' | 'insufficient_quality';
  reason: FaceDetectionReason;
  bbox: FaceBoundingBox | null;
  registeredAt: string | null;
  updatedAt: string | null;
  message: string;
}

export type FaceVerificationState =
  | 'verified'
  | 'not_verified'
  | 'unknown_participant'
  | 'no_face'
  | 'multiple_faces'
  | 'insufficient_quality';

export interface FaceVerificationResult {
  status: FaceVerificationState;
  reason: string;
  matched: boolean;
  bbox: FaceBoundingBox | null;
  message: string;
}

export interface TodayAttendanceRecord {
  id: string;
  participantName: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  isCorrected: boolean;
}

export interface TodayAttendanceSummary {
  attendanceDate: string;
  nextAction: AttendanceActionType | 'COMPLETED';
  faceRegistered: boolean;
  participantActive: boolean;
  withinInternshipPeriod: boolean;
  rules: {
    checkInStartTime: string;
    workStartTime: string;
    lateToleranceMinutes: number;
    workEndTime: string;
    checkOutEndTime: string;
  };
  todayRecord: TodayAttendanceRecord | null;
}

export interface AttendanceConfirmationData {
  id: string;
  participantName: string;
  attendanceType: AttendanceActionType;
  attendanceDate: string;
  recordedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  confirmationMessage: string;
}

export interface AttendanceMarkResponse {
  recorded: boolean;
  verificationStatus: FaceVerificationState;
  message: string;
  attendance?: AttendanceConfirmationData;
}
