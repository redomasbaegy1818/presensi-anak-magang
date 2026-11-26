import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import { getOrCreateAttendanceSetting } from '../repositories/settingsRepository.js';
import {
  evaluateCheckInStatusByRules,
  validateAttendanceRuleLogic,
} from '../services/attendanceRules.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';
import { parseHhMmToMinutes } from '../utils/dateWib.js';

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('AdminSettings!2026');

  const originalSetting = await getOrCreateAttendanceSetting();

  let adminId: string | null = null;
  let participantId: string | null = null;
  let participantUserId: string | null = null;

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
        email: `set-admin-${suffix}@example.internal`,
        username: `set_admin_${suffix}`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminId = admin.id;

    const adminPair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash: adminPair.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const adminCookie = `${env.SESSION_COOKIE_NAME}=${adminPair.token}`;

    const participant = await createParticipantWithUser({
      email: `set-p-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Raka Pratama',
      nimNis: `SET-${suffix}`,
      universitySchool: 'ITS',
      major: 'Teknik Informatika',
      division: 'Pengembangan Aplikasi',
      phone: '081200005555',
      internshipStartDate: new Date('2026-01-01'),
      internshipEndDate: new Date('2027-12-31'),
    });
    participantId = participant.id;
    participantUserId = participant.userId;

    const pPair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: participant.userId,
        tokenHash: pPair.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const pCookie = `${env.SESSION_COOKIE_NAME}=${pPair.token}`;

    // 1. Authorization checks
    const unauthGet = await fetch(`${baseUrl}/admin/settings`);
    assert.equal(unauthGet.status, 401);

    const unauthPut = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      }),
    });
    assert.equal(unauthPut.status, 401);

    const nonAdminGet = await fetch(`${baseUrl}/admin/settings`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(nonAdminGet.status, 403);

    const nonAdminPut = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: pCookie,
      },
      body: JSON.stringify({
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      }),
    });
    assert.equal(nonAdminPut.status, 403);

    // 2. Get current settings
    const getRes = await fetch(`${baseUrl}/admin/settings`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(getRes.status, 200);
    const getJson = (await getRes.json()) as {
      settings: {
        checkInStartTime: string;
        workStartTime: string;
        lateToleranceMinutes: number;
        workEndTime: string;
        checkOutEndTime: string;
        saveEvidence: boolean;
      };
    };
    assert.equal(getJson.settings.workStartTime, originalSetting.workStartTime);

    // 3. Invalid inputs (bad time, out-of-range tolerance, illogical ordering)
    const invalidPayloads = [
      {
        checkInStartTime: '25:99',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      },
      {
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: -5,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      },
      {
        checkInStartTime: '09:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      },
      {
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '16:30',
        saveEvidence: true,
      },
      {
        checkInStartTime: '06:00',
        workStartTime: '16:30',
        lateToleranceMinutes: 45,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        saveEvidence: true,
      },
    ];

    for (const payload of invalidPayloads) {
      assert.ok(validateAttendanceRuleLogic(payload).length > 0);
      const badRes = await fetch(`${baseUrl}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(badRes.status, 400);
    }

    // 4. Update settings via API and verify participant/today + rule evaluation use new settings
    const nextConfig = {
      checkInStartTime: '07:00',
      workStartTime: '09:00',
      lateToleranceMinutes: 5,
      workEndTime: '16:30',
      checkOutEndTime: '20:00',
      saveEvidence: false,
    };
    const updateRes = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify(nextConfig),
    });
    assert.equal(updateRes.status, 200);
    const updateJson = (await updateRes.json()) as {
      settings: {
        workStartTime: string;
        lateToleranceMinutes: number;
        workEndTime: string;
        saveEvidence: boolean;
        updatedByLabel: string | null;
      };
      message: string;
    };
    assert.equal(updateJson.settings.workStartTime, '09:00');
    assert.equal(updateJson.settings.lateToleranceMinutes, 5);
    assert.equal(updateJson.settings.workEndTime, '16:30');
    assert.equal(updateJson.settings.saveEvidence, false);
    assert.equal(updateJson.settings.updatedByLabel, admin.username);

    // Verify participant today endpoint reflects updated settings immediately
    const todayRes = await fetch(`${baseUrl}/participant/attendance/today`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(todayRes.status, 200);
    const todayJson = (await todayRes.json()) as {
      rules: {
        checkInStartTime: string;
        workStartTime: string;
        lateToleranceMinutes: number;
        workEndTime: string;
        checkOutEndTime: string;
      };
    };
    assert.equal(todayJson.rules.checkInStartTime, '07:00');
    assert.equal(todayJson.rules.workStartTime, '09:00');
    assert.equal(todayJson.rules.lateToleranceMinutes, 5);
    assert.equal(todayJson.rules.workEndTime, '16:30');
    assert.equal(todayJson.rules.checkOutEndTime, '20:00');

    // Verify centralized rule evaluator determines PRESENT vs LATE from updated DB row
    const persisted = await getOrCreateAttendanceSetting();
    assert.equal(
      evaluateCheckInStatusByRules(persisted, parseHhMmToMinutes('09:05')),
      'PRESENT',
    );
    assert.equal(
      evaluateCheckInStatusByRules(persisted, parseHhMmToMinutes('09:06')),
      'LATE',
    );

    console.log('SEMUA TEST ADMIN ATTENDANCE SETTINGS LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.attendanceSetting.update({
      where: { id: 1 },
      data: {
        checkInStartTime: originalSetting.checkInStartTime,
        workStartTime: originalSetting.workStartTime,
        lateToleranceMinutes: originalSetting.lateToleranceMinutes,
        workEndTime: originalSetting.workEndTime,
        checkOutEndTime: originalSetting.checkOutEndTime,
        saveEvidence: originalSetting.saveEvidence,
        updatedById: originalSetting.updatedById,
      },
    });
    if (participantId) {
      await prisma.participant.deleteMany({ where: { id: participantId } });
    }
    const uIds = [participantUserId, adminId].filter(
      (id): id is string => Boolean(id),
    );
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Admin Settings gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
