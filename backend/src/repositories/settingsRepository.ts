import { prisma } from '../lib/prisma.js';

export const DEFAULT_ATTENDANCE_SETTING = {
  checkInStartTime: '06:00',
  workStartTime: '08:00',
  lateToleranceMinutes: 15,
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
