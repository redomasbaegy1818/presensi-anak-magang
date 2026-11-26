import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

function extractCookieValue(setCookieHeader: string | null): string {
  assert(setCookieHeader, 'Set-Cookie header harus ada.');
  const firstPart = setCookieHeader.split(';')[0] ?? '';
  const eqIndex = firstPart.indexOf('=');
  assert(eqIndex > 0, 'Format Set-Cookie tidak valid.');
  return firstPart;
}

async function runTests() {
  const suffix = Date.now().toString();
  const adminEmail = `test-admin-${suffix}@example.internal`;
  const adminUsername = `testadmin_${suffix}`;
  const participantEmail = `test-participant-${suffix}@example.internal`;
  const validPassword = 'AdminKantorTest!2026';
  const passwordHash = await hashPassword(validPassword);

  let adminId: string | null = null;
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
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminId = admin.id;

    const participantUser = await prisma.user.create({
      data: {
        email: participantEmail,
        passwordHash,
        role: 'PARTICIPANT',
        isActive: true,
      },
    });
    participantUserId = participantUser.id;

    // 1. Protected API without cookie -> 401
    const unauthOverview = await fetch(`${baseUrl}/admin/overview`);
    assert.equal(unauthOverview.status, 401);

    // 2. Invalid account -> 401
    const invalidAccountRes = await fetch(`${baseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `nonexistent-${suffix}@example.internal`,
        password: validPassword,
      }),
    });
    assert.equal(invalidAccountRes.status, 401);

    // 3. Invalid password -> 401
    const invalidPasswordRes = await fetch(`${baseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmail,
        password: 'PasswordSalah123',
      }),
    });
    assert.equal(invalidPasswordRes.status, 401);

    // Non-admin account attempting admin login -> 401
    const nonAdminRes = await fetch(`${baseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: participantEmail,
        password: validPassword,
      }),
    });
    assert.equal(nonAdminRes.status, 401);

    // 4. Valid login (email & username)
    const loginRes = await fetch(`${baseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminUsername,
        password: validPassword,
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginJson = (await loginRes.json()) as {
      authenticated: boolean;
      user: { email: string; role: string };
    };
    assert.equal(loginJson.authenticated, true);
    assert.equal(loginJson.user.email, adminEmail);
    assert.equal(loginJson.user.role, 'ADMIN');

    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(setCookieHeader?.includes('HttpOnly'), 'Cookie harus HttpOnly.');
    const sessionCookie = extractCookieValue(setCookieHeader);

    // 5. Protected API with valid admin cookie -> 200
    const overviewRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(overviewRes.status, 200);
    const overviewJson = (await overviewRes.json()) as {
      admin: { userId: string };
      summary: { activeParticipants: number };
    };
    assert.equal(overviewJson.admin.userId, admin.id);
    assert.equal(typeof overviewJson.summary.activeParticipants, 'number');

    // Participant session trying to access admin API -> 403
    const participantTokenPair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: participantUser.id,
        tokenHash: participantTokenPair.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const participantForbiddenRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: {
        Cookie: `${env.SESSION_COOKIE_NAME}=${participantTokenPair.token}`,
      },
    });
    assert.equal(participantForbiddenRes.status, 403);

    // 6. Logout invalidates session in DB & clears cookie
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogoutRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(afterLogoutRes.status, 401);

    // 7. Tampered / invalid cookie & expired session -> 401
    const tamperedRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: `${env.SESSION_COOKIE_NAME}=invalid-token-123` },
    });
    assert.equal(tamperedRes.status, 401);

    const expiredPair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash: expiredPair.tokenHash,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expiredRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: {
        Cookie: `${env.SESSION_COOKIE_NAME}=${expiredPair.token}`,
      },
    });
    assert.equal(expiredRes.status, 401);

    console.log('SEMUA 7 TEST ADMIN AUTHENTICATION LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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
  console.error('Test Admin Authentication gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
