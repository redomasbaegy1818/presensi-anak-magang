import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

const SCRATCH_DIR =
  'C:/Users/lenovo/.gemini/antigravity/brain/7adcffbc-d0aa-4e72-85b9-62c23ac9ea49/scratch';

async function postImage(url: string, buf: Buffer, name: string, cookie: string) {
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }), name);
  return fetch(url, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  });
}

async function runQaNetworkAndEdge() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('QaNetwork!2026');
  const originalFaceUrl = env.FACE_SERVICE_URL;

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

  let slowMockServer: http.Server | null = null;

  try {
    // 1. Database unavailable error handling -> 503 DATABASE_UNAVAILABLE without leaking host
    const dbInitErr = new Prisma.PrismaClientInitializationError(
      'Can reach ep-secret-host:5432 failed',
      '6.6.0',
    );
    let capturedStatus = 0;
    let capturedBody: unknown = null;
    const mockRes = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: unknown) {
        capturedBody = body;
        return this;
      },
    } as unknown as Response;

    errorHandler(
      dbInitErr,
      {} as Request,
      mockRes,
      (() => undefined) as NextFunction,
    );
    assert.equal(capturedStatus, 503);
    assert.equal(
      (capturedBody as { error: string }).error,
      'DATABASE_UNAVAILABLE',
    );
    assert.equal(JSON.stringify(capturedBody).includes('ep-secret-host'), false);

    // 2. Setup admin & participant for live endpoint tests
    const admin = await prisma.user.create({
      data: {
        email: `qa-admin-${suffix}@example.internal`,
        username: `qa_admin_${suffix}`,
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
      email: `qa-p-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta QA',
      nimNis: `QA-${suffix}`,
      universitySchool: 'UNS',
      major: 'Informatika',
      division: 'QA Testing',
      phone: '081200008888',
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

    // 3. Empty report + Excel/PDF export with zero matching rows
    const emptyReportRes = await fetch(
      `${baseUrl}/admin/reports?reportType=monthly&startDate=2095-01-01&endDate=2095-01-31`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(emptyReportRes.status, 200);
    const emptyJson = (await emptyReportRes.json()) as {
      summary: { totalRecords: number; attendancePercentage: number };
      groupedRows: unknown[];
      detailRows: unknown[];
    };
    assert.equal(emptyJson.summary.totalRecords, 0);
    assert.equal(emptyJson.summary.attendancePercentage, 0);
    assert.equal(emptyJson.groupedRows.length, 0);
    assert.equal(emptyJson.detailRows.length, 0);

    const emptyXlsxRes = await fetch(
      `${baseUrl}/admin/reports/export?format=xlsx&reportType=monthly&startDate=2095-01-01&endDate=2095-01-31`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(emptyXlsxRes.status, 200);
    assert.equal(
      Buffer.from(await emptyXlsxRes.arrayBuffer()).subarray(0, 2).toString('utf8'),
      'PK',
    );

    const emptyPdfRes = await fetch(
      `${baseUrl}/admin/reports/export?format=pdf&reportType=monthly&startDate=2095-01-01&endDate=2095-01-31`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(emptyPdfRes.status, 200);
    assert.equal(
      Buffer.from(await emptyPdfRes.arrayBuffer()).subarray(0, 5).toString('utf8'),
      '%PDF-',
    );

    // 4. Live face-service full edge cases (one face, no face, multiple faces, blur, angle, lighting, distance, correct, incorrect, unknown)
    const p0Reg = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p0_reg.jpg'));
    const p0Dist = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p0_distance.jpg'));
    const p0Light = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p0_lighting.jpg'));
    const p0Angle = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p0_angle.jpg'));
    const p1Other = fs.readFileSync(path.join(SCRATCH_DIR, 'rec_p1_other.jpg'));
    const noneBuf = fs.readFileSync(path.join(SCRATCH_DIR, 'case_none.jpg'));
    const multiBuf = fs.readFileSync(path.join(SCRATCH_DIR, 'case_multi.jpg'));
    const blurBuf = fs.readFileSync(path.join(SCRATCH_DIR, 'case_blur.jpg'));

    // Unknown identity before registration
    const unknownRes = await postImage(
      `${baseUrl}/participant/face/verify`,
      p0Reg,
      'unknown.jpg',
      pCookie,
    );
    assert.equal(unknownRes.status, 200);
    assert.equal(((await unknownRes.json()) as { status: string }).status, 'unknown_participant');

    // /face/detect cases
    const detectOne = await postImage(`${baseUrl}/face/detect`, p0Reg, 'one.jpg', pCookie);
    assert.equal(detectOne.status, 200);
    assert.equal(((await detectOne.json()) as { status: string }).status, 'face_detected');

    const detectNone = await postImage(`${baseUrl}/face/detect`, noneBuf, 'none.jpg', pCookie);
    assert.equal(((await detectNone.json()) as { status: string }).status, 'no_face');

    const detectMulti = await postImage(`${baseUrl}/face/detect`, multiBuf, 'multi.jpg', pCookie);
    assert.equal(((await detectMulti.json()) as { status: string }).status, 'multiple_faces');

    const detectBlur = await postImage(`${baseUrl}/face/detect`, blurBuf, 'blur.jpg', pCookie);
    assert.equal(((await detectBlur.json()) as { status: string }).status, 'low_quality');

    // Register & verify across lighting, angle, distance, incorrect
    const regFace = await postImage(`${baseUrl}/participant/face/register`, p0Reg, 'reg.jpg', pCookie);
    assert.equal(regFace.status, 200);
    assert.equal(((await regFace.json()) as { registered: boolean }).registered, true);

    for (const [label, buf] of [
      ['correct', p0Reg],
      ['lighting', p0Light],
      ['angle', p0Angle],
      ['distance', p0Dist],
    ] as const) {
      const verifyRes = await postImage(
        `${baseUrl}/participant/face/verify`,
        buf,
        `${label}.jpg`,
        pCookie,
      );
      assert.equal(verifyRes.status, 200);
      const vJson = (await verifyRes.json()) as { status: string; matched: boolean };
      assert.equal(vJson.status, 'verified', `Expected verified for ${label}`);
      assert.equal(vJson.matched, true);
    }

    const wrongRes = await postImage(
      `${baseUrl}/participant/face/verify`,
      p1Other,
      'wrong.jpg',
      pCookie,
    );
    assert.equal(((await wrongRes.json()) as { status: string }).status, 'not_verified');

    // 5. Slow response (<8s) succeeds, timeout (>8s) returns 503, and unreachable face-service returns 503
    let responseDelayMs = 600;
    slowMockServer = http.createServer((_req, res) => {
      setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'no_face',
              reason: 'no_face',
              faceCount: 0,
              bbox: null,
            }),
          );
        }
      }, responseDelayMs);
    });
    await new Promise<void>((resolve) => slowMockServer!.listen(0, '127.0.0.1', resolve));
    const mockAddr = slowMockServer.address() as AddressInfo;
    env.FACE_SERVICE_URL = `http://127.0.0.1:${mockAddr.port}`;

    // Slow within budget (600 ms) -> 200
    const slowOk = await postImage(`${baseUrl}/face/detect`, p0Reg, 'slow.jpg', pCookie);
    assert.equal(slowOk.status, 200);

    // Timeout (>8000 ms) -> 503 FACE_SERVICE_UNAVAILABLE
    responseDelayMs = 9500;
    const timeoutRes = await postImage(`${baseUrl}/face/detect`, p0Reg, 'timeout.jpg', pCookie);
    assert.equal(timeoutRes.status, 503);
    assert.equal(((await timeoutRes.json()) as { error: string }).error, 'FACE_SERVICE_UNAVAILABLE');

    // Unreachable port -> 503 FACE_SERVICE_UNAVAILABLE
    await new Promise<void>((resolve) => slowMockServer!.close(() => resolve()));
    slowMockServer = null;
    const unreachableRes = await postImage(`${baseUrl}/face/detect`, p0Reg, 'down.jpg', pCookie);
    assert.equal(unreachableRes.status, 503);
    assert.equal(
      ((await unreachableRes.json()) as { error: string }).error,
      'FACE_SERVICE_UNAVAILABLE',
    );

    console.log('SEMUA TEST QA NETWORK & FACE EDGE CASES LOLOS.');
  } finally {
    env.FACE_SERVICE_URL = originalFaceUrl;
    if (slowMockServer) {
      await new Promise<void>((resolve) => slowMockServer!.close(() => resolve()));
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (participantId) {
      await prisma.participant.deleteMany({ where: { id: participantId } });
    }
    const uIds = [participantUserId, adminId].filter((id): id is string => Boolean(id));
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
    await prisma.$disconnect();
  }
}

runQaNetworkAndEdge().catch(async (error) => {
  console.error('Test QA Network & Edge gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
