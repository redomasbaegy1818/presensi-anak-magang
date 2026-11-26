import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import ExcelJS from 'exceljs';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createCheckInAttendance } from '../repositories/attendanceRepository.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('AdminReport!2026');

  let adminId: string | null = null;
  let participant1Id: string | null = null;
  let participant1UserId: string | null = null;
  let participant2Id: string | null = null;
  let participant2UserId: string | null = null;
  const createdAttendanceIds: string[] = [];

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
        email: `rep-admin-${suffix}@example.internal`,
        username: `rep_admin_${suffix}`,
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

    const p1 = await createParticipantWithUser({
      email: `rep-p1-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Dewi Anggraini',
      nimNis: `REP1-${suffix}`,
      universitySchool: 'UGM',
      major: 'Sistem Informasi',
      division: `Divisi Uji A ${suffix}`,
      phone: '081200004441',
      internshipStartDate: new Date('2098-05-01'),
      internshipEndDate: new Date('2098-08-31'),
    });
    participant1Id = p1.id;
    participant1UserId = p1.userId;

    const p2 = await createParticipantWithUser({
      email: `rep-p2-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Eko Prasetyo',
      nimNis: `REP2-${suffix}`,
      universitySchool: 'ITB',
      major: 'Teknik Komputer',
      division: `Divisi Uji B ${suffix}`,
      phone: '081200004442',
      internshipStartDate: new Date('2098-05-01'),
      internshipEndDate: new Date('2098-08-31'),
    });
    participant2Id = p2.id;
    participant2UserId = p2.userId;

    const p1Pair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: p1.userId,
        tokenHash: p1Pair.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const pCookie = `${env.SESSION_COOKIE_NAME}=${p1Pair.token}`;

    // 1. Seed real attendance rows across 2098-06-08 (Mon) and 2098-06-09 (Tue)
    const a1 = await createCheckInAttendance({
      participantId: p1.id,
      attendanceDate: new Date('2098-06-08T00:00:00.000Z'),
      checkInAt: new Date('2098-06-08T00:50:00.000Z'), // 07:50 WIB
      status: 'PRESENT',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.92,
    });
    createdAttendanceIds.push(a1.id);

    const a2 = await createCheckInAttendance({
      participantId: p1.id,
      attendanceDate: new Date('2098-06-09T00:00:00.000Z'),
      checkInAt: new Date('2098-06-09T01:25:00.000Z'), // 08:25 WIB
      status: 'LATE',
      verificationStatus: 'VERIFIED',
      verificationScore: 0.9,
    });
    createdAttendanceIds.push(a2.id);

    const a3 = await prisma.attendance.create({
      data: {
        participantId: p2.id,
        attendanceDate: new Date('2098-06-08T00:00:00.000Z'),
        status: 'ABSENT',
        verificationStatus: 'MANUAL_OVERRIDE',
        isCorrected: true,
      },
    });
    createdAttendanceIds.push(a3.id);

    // 2. Access control: unauthenticated & non-admin rejected
    const unauthReport = await fetch(`${baseUrl}/admin/reports`);
    assert.equal(unauthReport.status, 401);
    const unauthExport = await fetch(
      `${baseUrl}/admin/reports/export?format=xlsx`,
    );
    assert.equal(unauthExport.status, 401);

    const nonAdminReport = await fetch(`${baseUrl}/admin/reports`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(nonAdminReport.status, 403);
    const nonAdminExport = await fetch(
      `${baseUrl}/admin/reports/export?format=pdf`,
      { headers: { Cookie: pCookie } },
    );
    assert.equal(nonAdminExport.status, 403);

    // 3. Invalid query validation
    const invalidRangeRes = await fetch(
      `${baseUrl}/admin/reports?startDate=2098-06-10&endDate=2098-06-01`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(invalidRangeRes.status, 400);

    // 4. Report type: participant + division filter
    const partReportRes = await fetch(
      `${baseUrl}/admin/reports?reportType=participant&startDate=2098-06-08&endDate=2098-06-09&division=${encodeURIComponent(p1.division)}`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(partReportRes.status, 200);
    const partReport = (await partReportRes.json()) as {
      summary: {
        totalRecords: number;
        totalAttendance: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        attendancePercentage: number;
      };
      groupedRows: Array<{
        label: string;
        totalAttendance: number;
        lateCount: number;
        attendancePercentage: number;
      }>;
      detailRows: Array<Record<string, unknown>>;
    };
    assert.equal(partReport.summary.totalRecords, 2);
    assert.equal(partReport.summary.totalAttendance, 2);
    assert.equal(partReport.summary.presentCount, 1);
    assert.equal(partReport.summary.lateCount, 1);
    assert.equal(partReport.summary.absentCount, 0);
    assert.equal(partReport.summary.attendancePercentage, 100);
    assert.equal(partReport.groupedRows.length, 1);
    assert.equal(partReport.groupedRows[0]?.label, 'Dewi Anggraini');

    // Ensure zero biometric/internal leakage in detailRows
    const rawJson = JSON.stringify(partReport);
    assert.equal(rawJson.includes('embedding'), false);
    assert.equal(rawJson.includes('verificationScore'), false);
    assert.equal(rawJson.includes('storageKey'), false);

    // 5. Daily, weekly, monthly report across both participants with status filter
    for (const type of ['daily', 'weekly', 'monthly'] as const) {
      const res = await fetch(
        `${baseUrl}/admin/reports?reportType=${type}&startDate=2098-06-08&endDate=2098-06-09&status=LATE`,
        { headers: { Cookie: adminCookie } },
      );
      assert.equal(res.status, 200);
      const data = (await res.json()) as {
        summary: { lateCount: number; totalRecords: number };
        detailRows: Array<{ nimNis: string; status: string }>;
      };
      assert.equal(data.summary.lateCount, 1);
      assert.equal(data.detailRows.length >= 1, true);
      assert.equal(
        data.detailRows.every((r) => r.status === 'LATE'),
        true,
      );
    }

    // 6. Excel export (.xlsx)
    const xlsxRes = await fetch(
      `${baseUrl}/admin/reports/export?format=xlsx&reportType=monthly&startDate=2098-06-08&endDate=2098-06-09&participantId=${encodeURIComponent(p1.id)}`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(xlsxRes.status, 200);
    assert.equal(
      xlsxRes.headers.get('content-type')?.includes('spreadsheetml'),
      true,
    );
    assert.equal(xlsxRes.headers.get('cache-control'), 'no-store');
    const xlsxBytes = Buffer.from(await xlsxRes.arrayBuffer());
    assert.equal(xlsxBytes.subarray(0, 2).toString('utf8'), 'PK');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsxBytes as unknown as ArrayBuffer);
    assert.ok(wb.getWorksheet('Ringkasan Laporan'));
    const detailSheet = wb.getWorksheet('Detail Presensi');
    assert.ok(detailSheet);
    assert.equal(detailSheet.rowCount, 3); // header + 2 rows for p1

    // 7. PDF export (.pdf)
    const pdfRes = await fetch(
      `${baseUrl}/admin/reports/export?format=pdf&reportType=daily&startDate=2098-06-08&endDate=2098-06-09&participantId=${encodeURIComponent(p1.id)}`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    assert.equal(pdfRes.headers.get('cache-control'), 'no-store');
    const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdfBytes.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(pdfBytes.length > 500);

    console.log('SEMUA TEST ADMIN REPORTS & EXPORT LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdAttendanceIds.length > 0) {
      await prisma.attendance.deleteMany({
        where: { id: { in: createdAttendanceIds } },
      });
    }
    const pIds = [participant1Id, participant2Id].filter(
      (id): id is string => Boolean(id),
    );
    if (pIds.length > 0) {
      await prisma.participant.deleteMany({ where: { id: { in: pIds } } });
    }
    const uIds = [participant1UserId, participant2UserId, adminId].filter(
      (id): id is string => Boolean(id),
    );
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Admin Reports gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
