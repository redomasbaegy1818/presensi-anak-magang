import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { updateParticipantStatus } from '../repositories/participantRepository.js';
import { markParticipantAttendance } from '../services/attendanceService.js';
import { deletePrivateEvidenceFile } from '../services/evidenceStorageService.js';
import { registerParticipantFace } from '../services/faceVerificationService.js';
import { AppError } from '../utils/appError.js';

const SCRATCH_DIR =
  'C:/Users/lenovo/.gemini/antigravity/brain/7adcffbc-d0aa-4e72-85b9-62c23ac9ea49/scratch';
const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function wibInstant(dateStr: string, hhMm: string): Date {
  return new Date(`${dateStr}T${hhMm}:00+07:00`);
}

async function expectAppErrorCode(
  fn: () => Promise<unknown>,
  expectedCode: string,
) {
  try {
    await fn();
    throw new Error(`Expected AppError(${expectedCode}) but succeeded.`);
  } catch (err) {
    assert(
      err instanceof AppError && err.code === expectedCode,
      `Expected AppError(${expectedCode}), got ${String(err)}`,
    );
  }
}

async function runTests() {
  const p0Reg = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p0_reg.jpg'));
  const p0Lighting = fs.readFileSync(
    path.join(SCRATCH_DIR, 'rec_p0_lighting.jpg'),
  );
  const p1Other = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p1_other.jpg'));
  const noneBuf = fs.readFileSync(path.join(SCRATCH_DIR, 'case_none.jpg'));
  const multiBuf = fs.readFileSync(path.join(SCRATCH_DIR, 'case_multi.jpg'));

  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', (err) => reject(err));
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  const suffix = Date.now().toString();
  let createdUserId: string | null = null;
  let createdParticipantId: string | null = null;
  const evidenceKeysToClean: string[] = [];
  const originalSetting = await prisma.attendanceSetting.findUnique({
    where: { id: 1 },
  });

  try {
    // Ensure AttendanceSetting row id=1 uses 08:00 / 10m / 17:00 defaults during test
    const setting = await prisma.attendanceSetting.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        faceMatchThreshold: 0.5,
        saveEvidence: true,
      },
      update: {
        checkInStartTime: '06:00',
        workStartTime: '08:00',
        lateToleranceMinutes: 10,
        workEndTime: '17:00',
        checkOutEndTime: '21:00',
        faceMatchThreshold: 0.5,
        saveEvidence: true,
      },
    });
    assert.equal(setting.lateToleranceMinutes, 10);

    // 1. Register participant (within 2026-11-01..2027-02-01 internship window)
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dewi Anggraini',
        nimNis: `ATT${suffix}`,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Teknik Informatika',
        division: 'Teknologi Informasi',
        phone: '081234567899',
        email: `att-${suffix}@example.internal`,
        internshipStartDate: '2026-11-01',
        internshipEndDate: '2027-02-01',
        password: 'PasswordUji123!',
      }),
    });
    assert.equal(regRes.status, 201);
    const regJson = (await regRes.json()) as {
      user: { userId: string };
      participant: { id: string };
    };
    createdUserId = regJson.user.userId;
    createdParticipantId = regJson.participant.id;
    const cookie = (regRes.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

    // 2. Unknown participant (no registered face yet)
    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'p0.jpg',
          { now: wibInstant('2026-11-26', '07:55') },
        ),
      'UNKNOWN_PARTICIPANT',
    );

    // 3. Register participant face via SCRFD + w600k_mbf
    const faceReg = await registerParticipantFace(
      createdParticipantId,
      p0Reg,
      'image/jpeg',
      'reg.jpg',
    );
    assert.equal(faceReg.registered, true);

    // 4. Rules: check-out without check-in, before start, after end
    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'p0.jpg',
          {
            requestedType: 'CHECK_OUT',
            now: wibInstant('2026-11-26', '17:05'),
          },
        ),
      'CHECKOUT_WITHOUT_CHECKIN',
    );

    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'p0.jpg',
          { now: wibInstant('2026-11-26', '05:30') },
        ),
      'BEFORE_ATTENDANCE_START',
    );

    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'p0.jpg',
          { now: wibInstant('2026-11-26', '17:05') },
        ),
      'AFTER_ATTENDANCE_END',
    );

    // 5. Failed face verification, no face, multiple faces -> recorded=false
    const wrongFace = await markParticipantAttendance(
      createdParticipantId,
      p1Other,
      'image/jpeg',
      'other.jpg',
      { now: wibInstant('2026-11-26', '07:55') },
    );
    assert.equal(wrongFace.recorded, false);
    assert.equal(wrongFace.verificationStatus, 'not_verified');

    const noFace = await markParticipantAttendance(
      createdParticipantId,
      noneBuf,
      'image/jpeg',
      'none.jpg',
      { now: wibInstant('2026-11-26', '07:55') },
    );
    assert.equal(noFace.recorded, false);
    assert.equal(noFace.verificationStatus, 'no_face');

    const multiFace = await markParticipantAttendance(
      createdParticipantId,
      multiBuf,
      'image/jpeg',
      'multi.jpg',
      { now: wibInstant('2026-11-26', '07:55') },
    );
    assert.equal(multiFace.recorded, false);
    assert.equal(multiFace.verificationStatus, 'multiple_faces');

    // 6. On-time check-in (08:05 WIB, within 10-minute tolerance -> PRESENT)
    const onTimeRes = await markParticipantAttendance(
      createdParticipantId,
      p0Lighting,
      'image/jpeg',
      'ontime.jpg',
      { now: wibInstant('2026-11-26', '08:05') },
    );
    assert.equal(onTimeRes.recorded, true);
    assert.equal(onTimeRes.attendance?.attendanceType, 'CHECK_IN');
    assert.equal(onTimeRes.attendance?.status, 'PRESENT');

    // Duplicate check-in on same day -> DUPLICATE_CHECK_IN
    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'dup.jpg',
          {
            requestedType: 'CHECK_IN',
            now: wibInstant('2026-11-26', '08:06'),
          },
        ),
      'DUPLICATE_CHECK_IN',
    );

    // Check-out on same day (17:15 WIB)
    const checkOutRes = await markParticipantAttendance(
      createdParticipantId,
      p0Reg,
      'image/jpeg',
      'out.jpg',
      { now: wibInstant('2026-11-26', '17:15') },
    );
    assert.equal(checkOutRes.recorded, true);
    assert.equal(checkOutRes.attendance?.attendanceType, 'CHECK_OUT');

    // Duplicate check-out on same day -> DUPLICATE_ATTENDANCE
    await expectAppErrorCode(
      () =>
        markParticipantAttendance(
          createdParticipantId!,
          p0Reg,
          'image/jpeg',
          'dup-out.jpg',
          {
            requestedType: 'CHECK_OUT',
            now: wibInstant('2026-11-26', '17:20'),
          },
        ),
      'DUPLICATE_ATTENDANCE',
    );

    // 7. Late check-in (08:15 WIB on 2026-11-27 -> LATE)
    const lateRes = await markParticipantAttendance(
      createdParticipantId,
      p0Reg,
      'image/jpeg',
      'late.jpg',
      { now: wibInstant('2026-11-27', '08:15') },
    );
    assert.equal(lateRes.recorded, true);
    assert.equal(lateRes.attendance?.status, 'LATE');

    // Verify private evidence files saved on disk
    const evidences = await prisma.attendanceEvidence.findMany({
      where: { attendance: { participantId: createdParticipantId } },
    });
    assert.equal(evidences.length, 3);
    const storageBase = path.isAbsolute(env.EVIDENCE_STORAGE_DIR)
      ? env.EVIDENCE_STORAGE_DIR
      : path.resolve(BACKEND_ROOT, env.EVIDENCE_STORAGE_DIR);
    for (const ev of evidences) {
      evidenceKeysToClean.push(ev.storageKey);
      assert(
        fs.existsSync(path.join(storageBase, ev.storageKey)),
        `Evidence file missing: ${ev.storageKey}`,
      );
    }

    // 8. HTTP API flow: /today, /mark (live current date), /history
    const todayRes = await fetch(`${baseUrl}/participant/attendance/today`, {
      headers: { Cookie: cookie },
    });
    assert.equal(todayRes.status, 200);
    const todayJson = (await todayRes.json()) as {
      nextAction: string;
      rules: { workStartTime: string; lateToleranceMinutes: number };
    };
    assert.equal(todayJson.rules.workStartTime, '08:00');
    assert.equal(todayJson.rules.lateToleranceMinutes, 10);

    const historyRes = await fetch(
      `${baseUrl}/participant/attendance/history?month=2026-11`,
      { headers: { Cookie: cookie } },
    );
    assert.equal(historyRes.status, 200);
    const historyJson = (await historyRes.json()) as {
      records: Array<{ status: string }>;
    };
    assert.equal(historyJson.records.length, 2);

    // 9. Inactive participant blocked
    await updateParticipantStatus(createdParticipantId, 'INACTIVE');
    const inactiveForm = new FormData();
    inactiveForm.append(
      'image',
      new Blob([p0Reg], { type: 'image/jpeg' }),
      'inactive.jpg',
    );
    const inactiveRes = await fetch(`${baseUrl}/participant/attendance/mark`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: inactiveForm,
    });
    assert(inactiveRes.status === 401 || inactiveRes.status === 403);

    console.log('SEMUA TEST ATTENDANCE SYSTEM LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const key of evidenceKeysToClean) {
      await deletePrivateEvidenceFile(key);
    }
    if (createdParticipantId) {
      await prisma.attendance.deleteMany({
        where: { participantId: createdParticipantId },
      });
      await prisma.participant.deleteMany({
        where: { id: createdParticipantId },
      });
    }
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    if (originalSetting) {
      await prisma.attendanceSetting.update({
        where: { id: 1 },
        data: {
          checkInStartTime: originalSetting.checkInStartTime,
          workStartTime: originalSetting.workStartTime,
          lateToleranceMinutes: originalSetting.lateToleranceMinutes,
          workEndTime: originalSetting.workEndTime,
          checkOutEndTime: originalSetting.checkOutEndTime,
          faceMatchThreshold: originalSetting.faceMatchThreshold,
          saveEvidence: originalSetting.saveEvidence,
          updatedById: originalSetting.updatedById,
        },
      });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Attendance System gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
