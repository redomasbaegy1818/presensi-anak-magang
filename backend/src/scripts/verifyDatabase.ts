import { Prisma } from '@prisma/client';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import {
  correctAttendanceWithAudit,
  createCheckInAttendance,
} from '../repositories/attendanceRepository.js';
import {
  getProtectedFaceTemplateForVerification,
  upsertProtectedFaceTemplate,
} from '../repositories/faceTemplateRepository.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import { getOrCreateAttendanceSetting } from '../repositories/settingsRepository.js';
import { hashPassword } from '../utils/crypto.js';

async function assertPrismaUniqueViolation(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    throw new Error(`Constraint gagal: ${label} seharusnya menolak duplikasi.`);
  } catch (err) {
    assert(
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002',
      `${label}: expected P2002, got ${String(err)}`,
    );
  }
}

async function runVerification() {
  if (!env.DATABASE_URL || env.DATABASE_URL.includes('CHANGE_ME')) {
    throw new Error(
      'DATABASE_URL di backend/.env masih kosong atau berisi placeholder CHANGE_ME.',
    );
  }

  await prisma.$queryRaw`SELECT 1`;
  console.log('1. Koneksi PostgreSQL: OK');

  const suffix = Date.now().toString();
  const adminEmail = `verify-admin-${suffix}@example.internal`;
  const participantEmail = `verify-peserta-${suffix}@example.internal`;
  const nimNis = `VERIFY-${suffix}`;
  const passwordHash = await hashPassword('VerifikasiDb123!');

  let adminId: string | null = null;
  let participantId: string | null = null;
  let participantUserId: string | null = null;
  let attendanceId: string | null = null;

  try {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: `verify_admin_${suffix}`,
        passwordHash,
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    const setting = await getOrCreateAttendanceSetting();
    assert.equal(setting.id, 1);
    console.log('2. Admin & AttendanceSetting: OK');

    const participant = await createParticipantWithUser({
      email: participantEmail,
      passwordHash,
      fullName: 'Peserta Uji Database',
      nimNis,
      universitySchool: 'Universitas Uji',
      major: 'Informatika',
      division: 'Teknologi Informasi',
      phone: '081200000000',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2027-02-01'),
    });
    participantId = participant.id;
    participantUserId = participant.userId;

    await assertPrismaUniqueViolation(
      () =>
        createParticipantWithUser({
          email: participantEmail.toUpperCase(),
          passwordHash,
          fullName: 'Duplikat Email',
          nimNis: `${nimNis}-OTHER`,
          universitySchool: 'Universitas Uji',
          major: 'Informatika',
          division: 'Umum',
          phone: '081200000001',
          internshipStartDate: new Date('2026-11-01'),
          internshipEndDate: new Date('2027-02-01'),
        }),
      'Duplikasi email peserta',
    );

    await assertPrismaUniqueViolation(
      () =>
        createParticipantWithUser({
          email: `other-${participantEmail}`,
          passwordHash,
          fullName: 'Duplikat NIM',
          nimNis: nimNis.toLowerCase(),
          universitySchool: 'Universitas Uji',
          major: 'Informatika',
          division: 'Umum',
          phone: '081200000002',
          internshipStartDate: new Date('2026-11-01'),
          internshipEndDate: new Date('2027-02-01'),
        }),
      'Duplikasi NIM/NIS peserta',
    );
    console.log('3. Participant & pencegahan duplikasi email/NIM: OK');

    await upsertProtectedFaceTemplate({
      participantId: participant.id,
      encryptedEmbedding: 'encrypted-test-payload',
      encryptionIv: '00112233445566778899aabb',
      encryptionAuthTag: '00112233445566778899aabbccddeeff',
      detectorName: 'scrfd_2.5g',
      modelName: 'w600k_mbf',
      embeddingDim: 512,
      qualityScore: 0.92,
    });
    const tpl = await getProtectedFaceTemplateForVerification(participant.id);
    assert(tpl && tpl.embeddingDim === 512);
    console.log('4. FaceTemplate terproteksi: OK');

    const attendanceDate = new Date('2026-11-26');
    const attendance = await createCheckInAttendance({
      participantId: participant.id,
      attendanceDate,
      checkInAt: new Date('2026-11-26T01:05:00.000Z'),
      status: 'PRESENT',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.78,
      evidence: {
        storageKey: `verify/${suffix}.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: 12345,
      },
    });
    attendanceId = attendance.id;

    await assertPrismaUniqueViolation(
      () =>
        createCheckInAttendance({
          participantId: participant.id,
          attendanceDate,
          checkInAt: new Date('2026-11-26T01:10:00.000Z'),
          status: 'PRESENT',
          verificationStatus: 'VERIFIED',
        }),
      'Duplikasi presensi harian peserta',
    );

    await correctAttendanceWithAudit({
      attendanceId: attendance.id,
      adminUserId: admin.id,
      newStatus: 'LATE',
      reason: 'Verifikasi audit koreksi database',
    });

    let deleteBlocked = false;
    try {
      await prisma.participant.delete({ where: { id: participant.id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, 'Restrict foreign key pada Participant->Attendance harus menolak delete.');
    console.log('5. Attendance, Evidence, Audit, & Restrict FK: OK');
  } finally {
    if (attendanceId) {
      await prisma.attendanceCorrectionLog.deleteMany({ where: { attendanceId } });
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

runVerification().catch((error) => {
  console.error('Verifikasi database gagal:', error);
  process.exit(1);
});
