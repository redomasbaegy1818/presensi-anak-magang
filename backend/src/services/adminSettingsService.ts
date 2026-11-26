import {
  getAttendanceSettingForAdmin,
  updateAttendanceSettingByAdmin,
} from '../repositories/settingsRepository.js';
import { AppError } from '../utils/appError.js';
import type { AdminUpdateSettingsInput } from '../validation/adminSchemas.js';
import {
  toPublicAttendanceRules,
  validateAttendanceRuleLogic,
} from './attendanceRules.js';

function mapSettingForAdminResponse(
  setting: Awaited<ReturnType<typeof getAttendanceSettingForAdmin>>,
) {
  return {
    ...toPublicAttendanceRules(setting),
    saveEvidence: setting.saveEvidence,
    updatedAt: setting.updatedAt.toISOString(),
    updatedByLabel:
      setting.updatedBy?.username || setting.updatedBy?.email || null,
  };
}

export async function getAdminAttendanceSettings() {
  const setting = await getAttendanceSettingForAdmin();
  return {
    settings: mapSettingForAdminResponse(setting),
  };
}

export async function updateAdminAttendanceSettings(
  adminUserId: string,
  input: AdminUpdateSettingsInput,
) {
  const issues = validateAttendanceRuleLogic(input);
  if (issues.length > 0) {
    const details: Record<string, string[]> = {};
    for (const issue of issues) {
      details[issue.field] = [
        ...(details[issue.field] ?? []),
        issue.message,
      ];
    }
    throw AppError.badRequest(
      issues[0]?.message ?? 'Aturan jam presensi tidak valid.',
      'INVALID_ATTENDANCE_SETTINGS',
      details,
    );
  }

  const updated = await updateAttendanceSettingByAdmin({
    checkInStartTime: input.checkInStartTime,
    workStartTime: input.workStartTime,
    lateToleranceMinutes: input.lateToleranceMinutes,
    workEndTime: input.workEndTime,
    checkOutEndTime: input.checkOutEndTime,
    saveEvidence: input.saveEvidence,
    updatedById: adminUserId,
  });

  return {
    settings: mapSettingForAdminResponse(updated),
    message: 'Pengaturan aturan presensi berhasil disimpan.',
  };
}
