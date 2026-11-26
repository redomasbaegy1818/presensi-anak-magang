import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createCheckInAttendance } from '../repositories/attendanceRepository.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import {
  deletePrivateEvidenceFile,
  savePrivateEvidenceFile,
} from '../services/evidenceStorageService.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('AttendanceMgmt!2026');

  let adminId: string | null = null;
  let participantId: string | null = null;
  let participantUserId: string | null = null;
  let attendanceId: string | null = null;
  let evidenceStorageKey: string | null = null;

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
        email: `am-admin-${suffix}@example.internal`,
        username: `am_admin_${suffix}`,
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
      email: `am-p-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Bima Santoso',
      nimNis: `AM-${suffix}`,
      universitySchool: 'UNS',
      major: 'Informatika',
      division: 'Teknologi Informasi',
      phone: '081200003333',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2027-02-01'),
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

    // Save dummy JPEG evidence privately & record LATE attendance
    const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const savedEvidence = await savePrivateEvidenceFile(
      dummyJpeg,
      'image/jpeg',
      '2099-02-10',
    );
    evidenceStorageKey = savedEvidence.storageKey;

    const attendance = await createCheckInAttendance({
      participantId: participant.id,
      attendanceDate: new Date('2099-02-10T00:00:00.000Z'),
      checkInAt: new Date('2099-02-10T01:25:00.000Z'), // 08:25 WIB
      status: 'LATE',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.88,
      evidence: savedEvidence,
    });
    attendanceId = attendance.id;

    // 1. RBAC
    const unauth = await fetch(`${baseUrl}/admin/attendance`);
    assert.equal(unauth.status, 401);
    const forbidden = await fetch(`${baseUrl}/admin/attendance`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(forbidden.status, 403);

    // 2. Filter by date, participantId, status
    const listRes = await fetch(
      `${baseUrl}/admin/attendance?date=2099-02-10&participantId=${participant.id}&status=LATE`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(listRes.status, 200);
    const listText = await listRes.text();
    assert(!listText.includes(evidenceStorageKey));
    assert(!listText.includes('verificationScore'));
    const listJson = JSON.parse(listText) as {
      records: Array<{ id: string; hasCheckInEvidence: boolean }>;
      total: number;
    };
    assert.equal(listJson.total, 1);
    assert.equal(listJson.records[0]?.id, attendance.id);
    assert.equal(listJson.records[0]?.hasCheckInEvidence, true);

    // 3. Detail & private evidence stream
    const detailRes = await fetch(`${baseUrl}/admin/attendance/${attendance.id}`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(detailRes.status, 200);

    const evidenceRes = await fetch(
      `${baseUrl}/admin/attendance/${attendance.id}/evidence/CHECK_IN`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(evidenceRes.status, 200);
    assert.equal(evidenceRes.headers.get('cache-control'), 'no-store');
    const evidenceBytes = Buffer.from(await evidenceRes.arrayBuffer());
    assert.deepEqual(evidenceBytes, dummyJpeg);

    // 4. Reject silent/invalid corrections (missing reason or out < in)
    const missingReasonRes = await fetch(
      `${baseUrl}/admin/attendance/${attendance.id}/correct`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          status: 'PRESENT',
          checkInTime: '08:00',
          checkOutTime: '17:00',
          reason: 'ok',
        }),
      },
    );
    assert.equal(missingReasonRes.status, 400);

    const badOrderRes = await fetch(
      `${baseUrl}/admin/attendance/${attendance.id}/correct`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          status: 'PRESENT',
          checkInTime: '17:00',
          checkOutTime: '08:00',
          reason: 'Alasan uji urutan jam',
        }),
      },
    );
    assert.equal(badOrderRes.status, 400);

    // 5. Valid correction creates traceable audit log
    const correctRes = await fetch(
      `${baseUrl}/admin/attendance/${attendance.id}/correct`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          status: 'PRESENT',
          checkInTime: '07:55',
          checkOutTime: '17:05',
          reason: 'Kamera antre saat jam masuk, dikonfirmasi pembimbing',
        }),
      },
    );
    assert.equal(correctRes.status, 200);
    const correctJson = (await correctRes.json()) as {
      record: {
        status: string;
        isCorrected: boolean;
        verificationStatus: string;
        correctionLogs: Array<{
          previousStatus: string;
          newStatus: string;
          reason: string;
          adminLabel: string;
        }>;
      };
    };
    assert.equal(correctJson.record.status, 'PRESENT');
    assert.equal(correctJson.record.isCorrected, true);
    assert.equal(correctJson.record.verificationStatus, 'MANUAL_OVERRIDE');
    assert.equal(correctJson.record.correctionLogs.length, 1);
    assert.equal(correctJson.record.correctionLogs[0]?.previousStatus, 'LATE');
    assert.equal(correctJson.record.correctionLogs[0]?.newStatus, 'PRESENT');
    assert.equal(
      correctJson.record.correctionLogs[0]?.adminLabel,
      admin.username,
    );

    console.log('SEMUA TEST ADMIN ATTENDANCE MANAGEMENT LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (evidenceStorageKey) {
      await deletePrivateEvidenceFile(evidenceStorageKey);
    }
    if (attendanceId) {
      await prisma.attendanceCorrectionLog.deleteMany({
        where: { attendanceId },
      });
      await prisma.attendance.deleteMany({ where: { id: attendanceId } });
    }
    if (participantId) {
      await prisma.participant.deleteMany({ where: { id: participantId } });
    }
    if (participantUserId) {
      await prisma.user.deleteMany({ where: { id: participantUserId } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Admin Attendance Management gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
