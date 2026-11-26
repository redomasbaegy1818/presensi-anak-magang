import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createCheckInAttendance } from '../repositories/attendanceRepository.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import {
  getParticipantTodayAttendance,
  markParticipantAttendance,
} from '../services/attendanceService.js';
import { AppError } from '../utils/appError.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';
import { getWibDateTimeParts } from '../utils/dateWib.js';

function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('PermTest!2026');
  const now = new Date();
  const wib = getWibDateTimeParts(now, env.OFFICE_TIMEZONE);
  const todayStr = wib.dateStr;
  const tomorrowStr = addDaysYmd(todayStr, 1);

  const userIds: string[] = [];
  const participantIds: string[] = [];

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
        email: `perm-admin-${suffix}@example.internal`,
        username: `permadmin${suffix.slice(-4)}`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    userIds.push(admin.id);

    const adminToken = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash: adminToken.tokenHash,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const adminCookie = `${env.SESSION_COOKIE_NAME}=${adminToken.token}`;

    const p1 = await createParticipantWithUser({
      email: `perm-p1-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Izin Uji',
      nimNis: `PERM1-${suffix}`,
      universitySchool: 'Polines',
      major: 'Informatika',
      division: 'TI',
      phone: '081200001111',
      internshipStartDate: new Date('2026-01-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    userIds.push(p1.userId);
    participantIds.push(p1.id);

    await prisma.faceTemplate.create({
      data: {
        participantId: p1.id,
        encryptedEmbedding: 'dummy-encrypted',
        encryptionIv: 'dummy-iv',
        encryptionAuthTag: 'dummy-tag',
        detectorName: 'test-detector',
        modelName: 'test-model',
        embeddingDim: 128,
      },
    });

    const p1Token = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: p1.userId,
        tokenHash: p1Token.tokenHash,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const p1Cookie = `${env.SESSION_COOKIE_NAME}=${p1Token.token}`;

    const p2 = await createParticipantWithUser({
      email: `perm-p2-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Hadir Uji',
      nimNis: `PERM2-${suffix}`,
      universitySchool: 'Polines',
      major: 'SI',
      division: 'Umum',
      phone: '081200001112',
      internshipStartDate: new Date('2026-01-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    userIds.push(p2.userId);
    participantIds.push(p2.id);

    const p2Token = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: p2.userId,
        tokenHash: p2Token.tokenHash,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const p2Cookie = `${env.SESSION_COOKIE_NAME}=${p2Token.token}`;

    // 1. Auth & RBAC guards
    const unauthRes = await fetch(`${baseUrl}/participant/permissions`);
    assert.equal(unauthRes.status, 401);

    const participantAdminRes = await fetch(`${baseUrl}/admin/permissions`, {
      headers: { Cookie: p1Cookie },
    });
    assert.equal(participantAdminRes.status, 403);

    const adminParticipantRes = await fetch(`${baseUrl}/participant/permissions`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(adminParticipantRes.status, 403);

    // 2. Validation errors
    const badRangeRes = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p1Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'IZIN',
        startDate: tomorrowStr,
        endDate: todayStr,
        reason: 'Keperluan keluarga mendadak.',
      }),
    });
    assert.equal(badRangeRes.status, 400);

    const outsidePeriodRes = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p1Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'IZIN',
        startDate: '2025-05-01',
        endDate: '2025-05-01',
        reason: 'Di luar jadwal magang.',
      }),
    });
    assert.equal(outsidePeriodRes.status, 400);

    // 3. Submit valid 2-day IZIN
    const createRes = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p1Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'IZIN',
        startDate: todayStr,
        endDate: tomorrowStr,
        reason: 'Mengurus surat keterangan kampus.',
      }),
    });
    assert.equal(createRes.status, 201);
    const createdJson = (await createRes.json()) as {
      permission: { id: string; status: string; type: string };
    };
    assert.equal(createdJson.permission.status, 'PENDING');
    assert.equal(createdJson.permission.type, 'IZIN');
    const firstPermId = createdJson.permission.id;

    // 4. Overlap conflict check
    const overlapRes = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p1Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SAKIT',
        startDate: tomorrowStr,
        endDate: tomorrowStr,
        reason: 'Tumpang tindih dengan izin sebelumnya.',
      }),
    });
    assert.equal(overlapRes.status, 409);

    // 5. Participant list check
    const pListRes = await fetch(`${baseUrl}/participant/permissions`, {
      headers: { Cookie: p1Cookie },
    });
    assert.equal(pListRes.status, 200);
    const pListJson = (await pListRes.json()) as {
      permissions: Array<{ id: string; status: string }>;
    };
    assert.equal(pListJson.permissions.length, 1);

    // 6. Admin overview & admin list check
    const overviewRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(overviewRes.status, 200);
    const overviewJson = (await overviewRes.json()) as {
      summary: { pendingPermissions: number };
      recentPermissions: Array<{ id: string }>;
    };
    assert.ok(overviewJson.summary.pendingPermissions >= 1);
    assert.ok(
      overviewJson.recentPermissions.some((item) => item.id === firstPermId),
    );

    const adminListRes = await fetch(
      `${baseUrl}/admin/permissions?status=PENDING&search=${encodeURIComponent(`PERM1-${suffix}`)}`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(adminListRes.status, 200);
    const adminListJson = (await adminListRes.json()) as {
      permissions: Array<Record<string, unknown>>;
    };
    assert.equal(adminListJson.permissions.length, 1);
    assert.equal('embeddingData' in adminListJson.permissions[0]!, false);

    // 7. Reject without adminNote fails 400
    const rejectNoNoteRes = await fetch(
      `${baseUrl}/admin/permissions/${firstPermId}/review`,
      {
        method: 'PATCH',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'REJECTED', adminNote: '' }),
      },
    );
    assert.equal(rejectNoNoteRes.status, 400);

    // 8. Reject with note succeeds 200, re-review fails 409
    const rejectRes = await fetch(
      `${baseUrl}/admin/permissions/${firstPermId}/review`,
      {
        method: 'PATCH',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          adminNote: 'Mohon lampirkan jadwal resmi pada keterangan.',
        }),
      },
    );
    assert.equal(rejectRes.status, 200);
    const rejectedJson = (await rejectRes.json()) as {
      permission: { status: string; adminNote: string | null };
    };
    assert.equal(rejectedJson.permission.status, 'REJECTED');

    const reReviewRes = await fetch(
      `${baseUrl}/admin/permissions/${firstPermId}/review`,
      {
        method: 'PATCH',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      },
    );
    assert.equal(reReviewRes.status, 409);

    // 9. Re-submit SAKIT covering today and approve it -> Attendance sync + block check-in
    const createRes2 = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p1Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SAKIT',
        startDate: todayStr,
        endDate: todayStr,
        reason: 'Demam tinggi, perlu istirahat di rumah.',
      }),
    });
    assert.equal(createRes2.status, 201);
    const secondPermId = (
      (await createRes2.json()) as { permission: { id: string } }
    ).permission.id;

    const approveRes = await fetch(
      `${baseUrl}/admin/permissions/${secondPermId}/review`,
      {
        method: 'PATCH',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          adminNote: 'Lekas sembuh, izin dicatat.',
        }),
      },
    );
    assert.equal(approveRes.status, 200);

    const syncedAttendance = await prisma.attendance.findUnique({
      where: {
        participantId_attendanceDate: {
          participantId: p1.id,
          attendanceDate: wib.attendanceDate,
        },
      },
    });
    assert.ok(syncedAttendance);
    assert.equal(syncedAttendance.status, 'ABSENT');
    assert.equal(syncedAttendance.verificationStatus, 'MANUAL_OVERRIDE');
    assert.match(syncedAttendance.notes ?? '', /Sakit Disetujui/);

    const todaySummary = await getParticipantTodayAttendance(p1.id, now);
    assert.equal(todaySummary.todayPermission?.id, secondPermId);
    assert.equal(todaySummary.todayPermission?.status, 'APPROVED');

    await assert.rejects(
      () =>
        markParticipantAttendance(
          p1.id,
          Buffer.from([0xff, 0xd8, 0xff]),
          'image/jpeg',
          'test.jpg',
          { requestedType: 'CHECK_IN', now },
        ),
      (err) =>
        err instanceof AppError &&
        err.statusCode === 409 &&
        err.code === 'APPROVED_PERMISSION_EXISTS',
    );

    // 10. Cannot request permission for a date with PRESENT attendance
    await createCheckInAttendance({
      participantId: p2.id,
      attendanceDate: wib.attendanceDate,
      checkInAt: now,
      status: 'PRESENT',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.9,
    });

    const attendedConflictRes = await fetch(`${baseUrl}/participant/permissions`, {
      method: 'POST',
      headers: {
        Cookie: p2Cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'IZIN',
        startDate: todayStr,
        endDate: todayStr,
        reason: 'Sudah terlanjur masuk kerja.',
      }),
    });
    assert.equal(attendedConflictRes.status, 409);

    console.log('PERMISSION FEATURE TEST PASSED');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (participantIds.length > 0) {
      await prisma.permissionRequest.deleteMany({
        where: { participantId: { in: participantIds } },
      });
      await prisma.attendance.deleteMany({
        where: { participantId: { in: participantIds } },
      });
      await prisma.faceTemplate.deleteMany({
        where: { participantId: { in: participantIds } },
      });
      await prisma.participant.deleteMany({
        where: { id: { in: participantIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.session.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await prisma.$disconnect();
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
