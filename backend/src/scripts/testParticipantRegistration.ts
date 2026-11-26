import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

function extractCookieValue(setCookieHeader: string | null): string {
  assert(setCookieHeader, 'Set-Cookie header harus ada.');
  const firstPart = setCookieHeader.split(';')[0] ?? '';
  const eqIndex = firstPart.indexOf('=');
  assert(eqIndex > 0, 'Format Set-Cookie tidak valid.');
  return firstPart;
}

async function runTests() {
  const suffix = Date.now().toString();
  const email = `peserta-reg-${suffix}@example.internal`;
  const nimNis = `NIM${suffix}`;
  const password = 'PesertaMagang!2026';

  let createdParticipantId: string | null = null;
  let createdUserId: string | null = null;

  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', (err) => reject(err));
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    // 1. Validation error (invalid email, phone, date order, short password)
    const invalidRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'A',
        nimNis: '12',
        universitySchool: '',
        major: '',
        division: '',
        phone: 'abc',
        email: 'bukan-email',
        internshipStartDate: '2026-12-10',
        internshipEndDate: '2026-12-01',
        password: '123',
      }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidJson = (await invalidRes.json()) as {
      error: string;
      details: Record<string, string[]>;
    };
    assert.equal(invalidJson.error, 'VALIDATION_ERROR');
    assert(invalidJson.details.email?.length);
    assert(invalidJson.details.phone?.length);
    assert(invalidJson.details.internshipEndDate?.length);

    // 2. Valid registration -> 201 + HttpOnly cookie + ACTIVE + faceRegistered=false
    const validRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Siti Rahmawati',
        nimNis,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Informatika',
        division: 'Teknologi Informasi',
        phone: '0812-3456-7890',
        email,
        internshipStartDate: '2026-12-01',
        internshipEndDate: '2027-03-01',
        password,
      }),
    });
    assert.equal(validRes.status, 201);
    const validJson = (await validRes.json()) as {
      authenticated: boolean;
      user: { userId: string; role: string; participant: { faceRegistered: boolean } };
      participant: { id: string; nimNis: string; status: string; faceRegistered: boolean };
    };
    assert.equal(validJson.authenticated, true);
    assert.equal(validJson.user.role, 'PARTICIPANT');
    assert.equal(validJson.participant.status, 'ACTIVE');
    assert.equal(validJson.participant.faceRegistered, false);
    createdUserId = validJson.user.userId;
    createdParticipantId = validJson.participant.id;

    const cookie = extractCookieValue(validRes.headers.get('set-cookie'));

    // 3. Duplicate NIM/NIS (case variant) -> 409 DUPLICATE_NIM_NIS
    const dupNimRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Peserta Lain',
        nimNis: `  ${nimNis.toLowerCase()} `,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Sistem Informasi',
        division: 'Umum & Administrasi',
        phone: '081299998888',
        email: `other-${email}`,
        internshipStartDate: '2026-12-01',
        internshipEndDate: '2027-03-01',
        password,
      }),
    });
    assert.equal(dupNimRes.status, 409);
    const dupNimJson = (await dupNimRes.json()) as { error: string };
    assert.equal(dupNimJson.error, 'DUPLICATE_NIM_NIS');

    // 4. Duplicate email (case variant) -> 409 DUPLICATE_EMAIL
    const dupEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Peserta Lain',
        nimNis: `${nimNis}X`,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Sistem Informasi',
        division: 'Umum & Administrasi',
        phone: '081299998888',
        email: email.toUpperCase(),
        internshipStartDate: '2026-12-01',
        internshipEndDate: '2027-03-01',
        password,
      }),
    });
    assert.equal(dupEmailRes.status, 409);
    const dupEmailJson = (await dupEmailRes.json()) as { error: string };
    assert.equal(dupEmailJson.error, 'DUPLICATE_EMAIL');

    // 5. Participant profile endpoint returns 9 fields & faceRegistered=false
    const profileRes = await fetch(`${baseUrl}/participant/profile`, {
      headers: { Cookie: cookie },
    });
    assert.equal(profileRes.status, 200);
    const profileJson = (await profileRes.json()) as {
      profile: { fullName: string; nimNis: string; faceRegistered: boolean };
    };
    assert.equal(profileJson.profile.fullName, 'Siti Rahmawati');
    assert.equal(profileJson.profile.faceRegistered, false);

    // 6. Participant cannot access admin overview -> 403
    const adminForbidden = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Cookie: cookie },
    });
    assert.equal(adminForbidden.status, 403);

    // 7. Logout + re-login as participant works
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(logoutRes.status, 200);

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginRes.status, 200);

    console.log('SEMUA TEST PARTICIPANT REGISTRATION LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdParticipantId) {
      await prisma.participant.deleteMany({ where: { id: createdParticipantId } });
    }
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Participant Registration gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
