import type { AttendanceStatus } from '@prisma/client';
import { AppError } from '../utils/appError.js';
import { parseHhMmToMinutes } from '../utils/dateWib.js';

export interface AttendanceRuleConfig {
  checkInStartTime: string;
  workStartTime: string;
  lateToleranceMinutes: number;
  workEndTime: string;
  checkOutEndTime: string;
}

export interface PublicAttendanceRules {
  checkInStartTime: string;
  workStartTime: string;
  lateToleranceMinutes: number;
  workEndTime: string;
  checkOutEndTime: string;
}

export interface AttendanceRuleValidationIssue {
  field: keyof AttendanceRuleConfig;
  message: string;
}

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MIN_LATE_TOLERANCE_MINUTES = 0;
export const MAX_LATE_TOLERANCE_MINUTES = 180;

export function toPublicAttendanceRules(
  setting: AttendanceRuleConfig,
): PublicAttendanceRules {
  return {
    checkInStartTime: setting.checkInStartTime,
    workStartTime: setting.workStartTime,
    lateToleranceMinutes: setting.lateToleranceMinutes,
    workEndTime: setting.workEndTime,
    checkOutEndTime: setting.checkOutEndTime,
  };
}

export function validateAttendanceRuleLogic(
  input: AttendanceRuleConfig,
): AttendanceRuleValidationIssue[] {
  const issues: AttendanceRuleValidationIssue[] = [];

  const timeFields: Array<{
    field: Exclude<keyof AttendanceRuleConfig, 'lateToleranceMinutes'>;
    label: string;
  }> = [
    { field: 'checkInStartTime', label: 'Jam buka presensi masuk' },
    { field: 'workStartTime', label: 'Jam masuk kantor' },
    { field: 'workEndTime', label: 'Jam pulang kantor' },
    { field: 'checkOutEndTime', label: 'Batas akhir check-out' },
  ];

  let allTimesValid = true;
  for (const { field, label } of timeFields) {
    if (!HH_MM_REGEX.test(input[field])) {
      allTimesValid = false;
      issues.push({
        field,
        message: `${label} harus berformat HH:mm yang valid (00:00–23:59).`,
      });
    }
  }

  if (
    !Number.isInteger(input.lateToleranceMinutes) ||
    input.lateToleranceMinutes < MIN_LATE_TOLERANCE_MINUTES ||
    input.lateToleranceMinutes > MAX_LATE_TOLERANCE_MINUTES
  ) {
    issues.push({
      field: 'lateToleranceMinutes',
      message: `Toleransi keterlambatan harus antara ${MIN_LATE_TOLERANCE_MINUTES} hingga ${MAX_LATE_TOLERANCE_MINUTES} menit.`,
    });
  }

  if (!allTimesValid) {
    return issues;
  }

  const checkInStartMin = parseHhMmToMinutes(input.checkInStartTime);
  const workStartMin = parseHhMmToMinutes(input.workStartTime);
  const workEndMin = parseHhMmToMinutes(input.workEndTime);
  const checkOutEndMin = parseHhMmToMinutes(input.checkOutEndTime);

  if (checkInStartMin > workStartMin) {
    issues.push({
      field: 'checkInStartTime',
      message:
        'Jam buka presensi masuk tidak boleh lebih lambat dari jam masuk kantor.',
    });
  }

  if (workStartMin >= workEndMin) {
    issues.push({
      field: 'workEndTime',
      message: 'Jam pulang kantor harus lebih lambat dari jam masuk kantor.',
    });
  } else if (
    Number.isInteger(input.lateToleranceMinutes) &&
    input.lateToleranceMinutes >= MIN_LATE_TOLERANCE_MINUTES &&
    workStartMin + input.lateToleranceMinutes >= workEndMin
  ) {
    issues.push({
      field: 'lateToleranceMinutes',
      message:
        'Jam masuk ditambah toleransi keterlambatan harus lebih awal dari jam pulang kantor.',
    });
  }

  if (checkOutEndMin < workEndMin) {
    issues.push({
      field: 'checkOutEndTime',
      message:
        'Batas akhir check-out tidak boleh lebih awal dari jam pulang kantor.',
    });
  }

  return issues;
}

export function evaluateCheckInStatusByRules(
  rules: AttendanceRuleConfig,
  minutesOfDay: number,
): AttendanceStatus {
  const checkInStartMin = parseHhMmToMinutes(rules.checkInStartTime);
  const workStartMin = parseHhMmToMinutes(rules.workStartTime);
  const lateDeadlineMin = workStartMin + rules.lateToleranceMinutes;
  const workEndMin = parseHhMmToMinutes(rules.workEndTime);

  if (minutesOfDay < checkInStartMin) {
    throw AppError.badRequest(
      `Presensi masuk belum dibuka. Layanan dibuka mulai pukul ${rules.checkInStartTime} WIB.`,
      'BEFORE_ATTENDANCE_START',
    );
  }

  if (minutesOfDay > workEndMin) {
    throw AppError.badRequest(
      `Batas waktu presensi masuk telah berakhir pada pukul ${rules.workEndTime} WIB.`,
      'AFTER_ATTENDANCE_END',
    );
  }

  return minutesOfDay <= lateDeadlineMin ? 'PRESENT' : 'LATE';
}

export function assertCheckOutWithinRules(
  rules: AttendanceRuleConfig,
  minutesOfDay: number,
): void {
  const checkOutEndMin = parseHhMmToMinutes(rules.checkOutEndTime);
  if (minutesOfDay > checkOutEndMin) {
    throw AppError.badRequest(
      `Batas waktu presensi pulang telah berakhir pada pukul ${rules.checkOutEndTime} WIB.`,
      'AFTER_ATTENDANCE_END',
    );
  }
}
