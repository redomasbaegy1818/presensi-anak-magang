import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getOrCreateAttendanceSetting } from '../repositories/settingsRepository.js';
import { getWibDateTimeParts } from '../utils/dateWib.js';
import { toPublicAttendanceRules } from './attendanceRules.js';

export async function getAdminOverviewSummary(now: Date = new Date()) {
  const wib = getWibDateTimeParts(now, env.OFFICE_TIMEZONE);
  const todayDate = wib.attendanceDate;

  const [
    activeParticipants,
    presentToday,
    lateToday,
    activeAttendedToday,
    checkedOutToday,
    setting,
    recentRows,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: 'ACTIVE' } }),
    prisma.attendance.count({
      where: { attendanceDate: todayDate, status: 'PRESENT' },
    }),
    prisma.attendance.count({
      where: { attendanceDate: todayDate, status: 'LATE' },
    }),
    prisma.attendance.count({
      where: {
        attendanceDate: todayDate,
        status: { in: ['PRESENT', 'LATE'] },
        participant: { status: 'ACTIVE' },
      },
    }),
    prisma.attendance.count({
      where: {
        attendanceDate: todayDate,
        checkOutAt: { not: null },
      },
    }),
    getOrCreateAttendanceSetting(),
    prisma.attendance.findMany({
      where: { attendanceDate: todayDate },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        participantId: true,
        attendanceDate: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        verificationStatus: true,
        isCorrected: true,
        participant: {
          select: {
            fullName: true,
            nimNis: true,
            division: true,
          },
        },
      },
    }),
  ]);

  const attendedToday = presentToday + lateToday;
  const notCheckedInToday = Math.max(0, activeParticipants - activeAttendedToday);

  return {
    timezone: env.OFFICE_TIMEZONE,
    attendanceDate: wib.dateStr,
    rules: toPublicAttendanceRules(setting),
    summary: {
      activeParticipants,
      attendedToday,
      presentToday,
      lateToday,
      notCheckedInToday,
      checkedOutToday,
    },
    recentAttendance: recentRows.map((row) => ({
      id: row.id,
      participantId: row.participantId,
      participantName: row.participant.fullName,
      nimNis: row.participant.nimNis,
      division: row.participant.division,
      attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
      checkInAt: row.checkInAt?.toISOString() ?? null,
      checkOutAt: row.checkOutAt?.toISOString() ?? null,
      status: row.status,
      verificationStatus: row.verificationStatus,
      isCorrected: row.isCorrected,
    })),
    checkedAt: new Date().toISOString(),
  };
}
