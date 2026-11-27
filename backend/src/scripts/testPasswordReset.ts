import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import {
  createSessionTokenPair,
  hashPassword,
  hashSessionToken,
} from '../utils/crypto.js';

async function runTests() {
  const suffix = Date.now().toString();
  const initialHash = await hashPassword('InitialPass!2026');
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
        email: `reset-admin-${suffix}@example.internal`,
        username: `resetadmin${suffix.slice(-4)}`,
        passwordHash: initialHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    userIds.push(admin.id);

    const adminSession = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash: adminSession.tokenHash,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const adminCookie = `${env.SESSION_COOKIE_NAME}=${adminSession.token}`;

    const p1 = await createParticipantWithUser({
      email: `reset-p1-${suffix}@example.internal`,
      passwordHash: initialHash,
      fullName: 'Peserta Reset Uji',
      nimNis: `RST1-${suffix}`,
      universitySchool: 'Polines',
      major: 'TI',
      division: 'TI',
      phone: '081200009991',
      internshipStartDate: new Date('2026-01-01'),
      internshipEndDate: new Date('2099-12-31'),
    });
    userIds.push(p1.userId);
    participantIds.push(p1.id);

    const pSession = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: p1.userId,
        tokenHash: pSession.tokenHash,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const pCookie = `${env.SESSION_COOKIE_NAME}=${pSession.token}`;

    // 1. Unknown user returns generic 200 (no enumeration)
    const unknownRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `nobody-${suffix}@example.internal`,
        portal: 'PARTICIPANT',
      }),
    });
    assert.equal(unknownRes.status, 200);

    // 2. Forgot password creates token in DB without exposing it in HTTP response
    const forgotAdminRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: admin.username,
        portal: 'ADMIN',
      }),
    });
    assert.equal(forgotAdminRes.status, 200);
    const forgotAdminJson = (await forgotAdminRes.json()) as Record<
      string,
      unknown
    >;
    assert.equal('resetUrl' in forgotAdminJson, false);
    assert.equal('token' in forgotAdminJson, false);

    const adminTokenRow = await prisma.passwordResetToken.findFirst({
      where: { userId: admin.id, usedAt: null },
    });
    assert.ok(adminTokenRow);

    // 3. Invalid token verify returns 400
    const badVerifyRes = await fetch(
      `${baseUrl}/auth/reset-password/verify?token=invalid-token-value-123456`,
    );
    assert.equal(badVerifyRes.status, 400);

    // 4. Participant cannot generate reset link, Admin can
    const forbiddenLinkRes = await fetch(
      `${baseUrl}/admin/participants/${p1.id}/reset-password-link`,
      {
        method: 'POST',
        headers: { Cookie: pCookie },
      },
    );
    assert.equal(forbiddenLinkRes.status, 403);

    const adminLinkRes = await fetch(
      `${baseUrl}/admin/participants/${p1.id}/reset-password-link`,
      {
        method: 'POST',
        headers: { Cookie: adminCookie },
      },
    );
    assert.equal(adminLinkRes.status, 201);
    const adminLinkJson = (await adminLinkRes.json()) as {
      resetUrl: string;
    };
    const token = new URL(adminLinkJson.resetUrl).searchParams.get('token');
    assert.ok(token);

    // 5. Verify generated token -> 200
    const verifyRes = await fetch(
      `${baseUrl}/auth/reset-password/verify?token=${encodeURIComponent(token)}`,
    );
    assert.equal(verifyRes.status, 200);
    const verifyJson = (await verifyRes.json()) as {
      valid: boolean;
      portal: string;
    };
    assert.equal(verifyJson.valid, true);
    assert.equal(verifyJson.portal, 'PARTICIPANT');

    // 6. Reset password -> revokes old sessions, updates hash, consumes token
    const newPassword = 'NewPassword!2026';
    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPassword }),
    });
    assert.equal(resetRes.status, 200);

    // Old participant session should now be revoked -> 401
    const oldSessionRes = await fetch(`${baseUrl}/participant/profile`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(oldSessionRes.status, 401);

    // Reusing token fails -> 400
    const reuseRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'AnotherPass!2026' }),
    });
    assert.equal(reuseRes.status, 400);

    // Old password login fails -> 401; new password succeeds -> 200
    const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: p1.user.email,
        password: 'InitialPass!2026',
      }),
    });
    assert.equal(oldLoginRes.status, 401);

    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: p1.user.email,
        password: newPassword,
      }),
    });
    assert.equal(newLoginRes.status, 200);

    // 7. 6-digit OTP verification flow + brute-force lockout after 5 wrong guesses
    const otpForgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: p1.user.email,
        portal: 'PARTICIPANT',
      }),
    });
    assert.equal(otpForgotRes.status, 200);

    const activeOtpToken = await prisma.passwordResetToken.findFirst({
      where: { userId: p1.userId, usedAt: null },
    });
    assert.ok(activeOtpToken?.codeHash);

    // 5 wrong attempts lock the OTP token
    for (let i = 0; i < 5; i += 1) {
      const wrongCodeRes = await fetch(
        `${baseUrl}/auth/reset-password/verify-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: p1.user.email,
            portal: 'PARTICIPANT',
            code: '000000',
          }),
        },
      );
      assert.equal(wrongCodeRes.status, 400);
    }

    const lockedRow = await prisma.passwordResetToken.findUnique({
      where: { id: activeOtpToken.id },
    });
    assert.ok(lockedRow?.usedAt);
    assert.equal(lockedRow?.codeAttempts, 5);

    // Issue fresh known 6-digit OTP hash and test verify-code + reset-password/with-code
    const freshPair = createSessionTokenPair();
    const knownCode = '482913';
    await prisma.passwordResetToken.create({
      data: {
        userId: p1.userId,
        tokenHash: freshPair.tokenHash,
        codeHash: hashSessionToken(`${p1.userId}:${knownCode}`),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });

    const verifyCodeRes = await fetch(
      `${baseUrl}/auth/reset-password/verify-code`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: p1.user.email,
          portal: 'PARTICIPANT',
          code: knownCode,
        }),
      },
    );
    assert.equal(verifyCodeRes.status, 200);

    const otpPassword = 'OtpUpdatedPass!2026';
    const resetWithCodeRes = await fetch(
      `${baseUrl}/auth/reset-password/with-code`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: p1.user.email,
          portal: 'PARTICIPANT',
          code: knownCode,
          password: otpPassword,
        }),
      },
    );
    assert.equal(resetWithCodeRes.status, 200);

    // Reuse same code fails -> 400
    const reuseOtpRes = await fetch(
      `${baseUrl}/auth/reset-password/with-code`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: p1.user.email,
          portal: 'PARTICIPANT',
          code: knownCode,
          password: 'AnotherOtpPass!2026',
        }),
      },
    );
    assert.equal(reuseOtpRes.status, 400);

    // Login with OTP-updated password succeeds -> 200
    const otpLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: p1.user.email,
        password: otpPassword,
      }),
    });
    assert.equal(otpLoginRes.status, 200);

    // 8. Face reset verification endpoint validation & unregistered face guard
    const missingImgRes = await fetch(
      `${baseUrl}/auth/reset-password/verify-face`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: p1.user.email,
          nimNis: p1.nimNis,
        }),
      },
    );
    assert.equal(missingImgRes.status, 400);

    const noFaceForm = new FormData();
    noFaceForm.append('email', p1.user.email);
    noFaceForm.append('nimNis', p1.nimNis);
    noFaceForm.append(
      'image',
      new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])], {
        type: 'image/jpeg',
      }),
      'face.jpg',
    );
    const noFaceTemplateRes = await fetch(
      `${baseUrl}/auth/reset-password/verify-face`,
      {
        method: 'POST',
        body: noFaceForm,
      },
    );
    assert.equal(noFaceTemplateRes.status, 400);

    console.log('PASSWORD RESET TEST PASSED');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (participantIds.length > 0) {
      await prisma.participant.deleteMany({
        where: { id: { in: participantIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } },
      });
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
