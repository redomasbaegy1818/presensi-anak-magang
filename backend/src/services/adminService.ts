import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

function getTodayJakartaDate(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.OFFICE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(new Date());
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function getAdminOverviewSummary() {
  const todayDate = getTodayJakartaDate();

  const [activeParticipants, presentToday, lateToday] = await Promise.all([
    prisma.participant.count({ where: { status: 'ACTIVE' } }),
    prisma.attendance.count({
      where: { attendanceDate: todayDate, status: 'PRESENT' },
    }),
    prisma.attendance.count({
      where: { attendanceDate: todayDate, status: 'LATE' },
    }),
  ]);

  const notCheckedInToday = Math.max(
    0,
    activeParticipants - (presentToday + lateToday),
  );

  return {
    timezone: env.OFFICE_TIMEZONE,
    summary: {
      activeParticipants,
      presentToday,
      lateToday,
      notCheckedInToday,
    },
    checkedAt: new Date().toISOString(),
  };
}
