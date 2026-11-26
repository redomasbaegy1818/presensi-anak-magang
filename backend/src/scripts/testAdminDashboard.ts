import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createCheckInAttendance } from '../repositories/attendanceRepository.js';
import {
  createParticipantWithUser,
  updateParticipantStatus,
} from '../repositories/participantRepository.js';
import { getAdminOverviewSummary } from '../services/adminService.js';
import { getWibDateTimeParts } from '../utils/dateWib.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('DashboardTest!2026');
  const testDate = new Date('2099-01-15T01:00:00.000Z');
  const testWib = getWibDateTimeParts(testDate, env.OFFICE_TIMEZONE);

  let adminId: string | null = null;
  const userIds: string[] = [];
  const participantIds: string[] = [];
  const attendanceIds: string[] = [];

  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', (err) => reject(err));
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    const admin = await prisma.user.create({
      data: {
        email: `dash-admin-${suffix}@example.internal`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminId = admin.id;

    const { token, tokenHash } = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const cookie = `${env.SESSION_COOKIE_NAME}=${token}`;

    // 1. Empty state check on isolated future date
    const emptyOverview = await getAdminOverviewSummary(testDate);
    assert.equal(emptyOverview.attendanceDate, '2099-01-15');
    assert.equal(emptyOverview.summary.attendedToday, 0);
    assert.equal(emptyOverview.recentAttendance.length, 0);

    // 2. Create 3 active participants + 1 inactive participant
    const p1 = await createParticipantWithUser({
      email: `dash-p1-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Hadir',
      nimNis: `DASH1-${suffix}`,
      universitySchool: 'UNS',
      major: 'Informatika',
      division: 'TI',
      phone: '081200000011',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    const p2 = await createParticipantWithUser({
      email: `dash-p2-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Terlambat',
      nimNis: `DASH2-${suffix}`,
      universitySchool: 'UNS',
      major: 'SI',
      division: 'Umum',
      phone: '081200000012',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    const p3 = await createParticipantWithUser({
      email: `dash-p3-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Belum Presensi',
      nimNis: `DASH3-${suffix}`,
      universitySchool: 'UNS',
      major: 'MI',
      division: 'Keuangan',
      phone: '081200000013',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    const p4 = await createParticipantWithUser({
      email: `dash-p4-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Nonaktif',
      nimNis: `DASH4-${suffix}`,
      universitySchool: 'UNS',
      major: 'DKV',
      division: 'Humas',
      phone: '081200000014',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    participantIds.push(p1.id, p2.id, p3.id, p4.id);
    userIds.push(p1.userId, p2.userId, p3.userId, p4.userId);
    await updateParticipantStatus(p4.id, 'INACTIVE');

    const a1 = await createCheckInAttendance({
      participantId: p1.id,
      attendanceDate: testWib.attendanceDate,
      checkInAt: new Date('2099-01-15T00:55:00.000Z'),
      status: 'PRESENT',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.85,
    });
    await prisma.attendance.update({
      where: { id: a1.id },
      data: { checkOutAt: new Date('2099-01-15T10:05:00.000Z') },
    });
    const a2 = await createCheckInAttendance({
      participantId: p2.id,
      attendanceDate: testWib.attendanceDate,
      checkInAt: new Date('2099-01-15T01:20:00.000Z'),
      status: 'LATE',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.82,
    });
    attendanceIds.push(a1.id, a2.id);

    // 3. Populated summary accuracy & no sensitive fields
    const populated = await getAdminOverviewSummary(testDate);
    assert(populated.summary.activeParticipants >= 3);
    assert.equal(populated.summary.presentToday, 1);
    assert.equal(populated.summary.lateToday, 1);
    assert.equal(populated.summary.attendedToday, 2);
    assert.equal(populated.summary.checkedOutToday, 1);
    assert(populated.summary.notCheckedInToday >= 1);
    assert.equal(populated.recentAttendance.length, 2);
    const serialized = JSON.stringify(populated);
    assert(!serialized.includes('verificationScore'));
    assert(!serialized.includes('encryptedEmbedding'));

    // 4. Live HTTP /api/v1/admin/overview check
    const apiRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: cookie },
    });
    assert.equal(apiRes.status, 200);
    const apiJson = (await apiRes.json()) as {
      attendanceDate: string;
      summary: { activeParticipants: number };
      recentAttendance: unknown[];
    };
    assert.match(apiJson.attendanceDate, /^\d{4}-\d{2}-\d{2}$/);
    assert(apiJson.summary.activeParticipants >= 3);
    assert(Array.isArray(apiJson.recentAttendance));

    console.log('SEMUA TEST ADMIN DASHBOARD LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (attendanceIds.length > 0) {
      await prisma.attendance.deleteMany({
        where: { id: { in: attendanceIds } },
      });
    }
    if (participantIds.length > 0) {
      await prisma.participant.deleteMany({
        where: { id: { in: participantIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Admin Dashboard gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
