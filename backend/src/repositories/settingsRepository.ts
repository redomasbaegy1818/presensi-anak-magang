import { prisma } from '../lib/prisma.js';

export const DEFAULT_ATTENDANCE_SETTING = {
  checkInStartTime: '06:00',
  workStartTime: '08:00',
  lateToleranceMinutes: 10,
  workEndTime: '17:00',
  checkOutEndTime: '21:00',
  faceMatchThreshold: 0.5,
  saveEvidence: true,
};

export async function getOrCreateAttendanceSetting() {
  return prisma.attendanceSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...DEFAULT_ATTENDANCE_SETTING,
    },
    update: {},
  });
}

export async function getAttendanceSettingForAdmin() {
  await getOrCreateAttendanceSetting();
  return prisma.attendanceSetting.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      checkInStartTime: true,
      workStartTime: true,
      lateToleranceMinutes: true,
      workEndTime: true,
      checkOutEndTime: true,
      saveEvidence: true,
      updatedAt: true,
      updatedBy: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });
}

export interface UpdateAttendanceSettingInput {
  checkInStartTime: string;
  workStartTime: string;
  lateToleranceMinutes: number;
  workEndTime: string;
  checkOutEndTime: string;
  saveEvidence: boolean;
  updatedById: string;
}

export async function updateAttendanceSettingByAdmin(
  input: UpdateAttendanceSettingInput,
) {
  await getOrCreateAttendanceSetting();
  return prisma.attendanceSetting.update({
    where: { id: 1 },
    data: {
      checkInStartTime: input.checkInStartTime,
      workStartTime: input.workStartTime,
      lateToleranceMinutes: input.lateToleranceMinutes,
      workEndTime: input.workEndTime,
      checkOutEndTime: input.checkOutEndTime,
      saveEvidence: input.saveEvidence,
      updatedById: input.updatedById,
    },
    select: {
      checkInStartTime: true,
      workStartTime: true,
      lateToleranceMinutes: true,
      workEndTime: true,
      checkOutEndTime: true,
      saveEvidence: true,
      updatedAt: true,
      updatedBy: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });
}
