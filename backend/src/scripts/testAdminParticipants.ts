import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { upsertProtectedFaceTemplate } from '../repositories/faceTemplateRepository.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

async function runTests() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('ParticipantMgmt!2026');

  let adminId: string | null = null;
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
        email: `pm-admin-${suffix}@example.internal`,
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
      email: `pm-one-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Raka Pratama',
      nimNis: `PM1-${suffix}`,
      universitySchool: 'Universitas Sebelas Maret',
      major: 'Informatika',
      division: 'Teknologi Informasi',
      phone: '081200001111',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2027-02-01'),
    });
    const p2 = await createParticipantWithUser({
      email: `pm-two-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Nadia Kusuma',
      nimNis: `PM2-${suffix}`,
      universitySchool: 'Politeknik Negeri',
      major: 'Akuntansi',
      division: 'Keuangan',
      phone: '081200002222',
      internshipStartDate: new Date('2026-11-01'),
      internshipEndDate: new Date('2027-02-01'),
    });
    participantIds.push(p1.id, p2.id);
    userIds.push(p1.userId, p2.userId);

    // Give p1 a protected face template to confirm embeddings are never exposed
    await upsertProtectedFaceTemplate({
      participantId: p1.id,
      encryptedEmbedding: 'secret-ciphertext-should-never-leak',
      encryptionIv: '00112233445566778899aabb',
      encryptionAuthTag: '00112233445566778899aabbccddeeff',
      detectorName: 'det_500m',
      modelName: 'w600k_mbf',
      embeddingDim: 512,
      qualityScore: 0.91,
    });

    const p1SessionPair = createSessionTokenPair();
    await prisma.session.create({
      data: {
        userId: p1.userId,
        tokenHash: p1SessionPair.tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const p1Cookie = `${env.SESSION_COOKIE_NAME}=${p1SessionPair.token}`;

    // 1. Auth & RBAC check
    const unauth = await fetch(`${baseUrl}/admin/participants`);
    assert.equal(unauth.status, 401);
    const forbidden = await fetch(`${baseUrl}/admin/participants`, {
      headers: { Cookie: p1Cookie },
    });
    assert.equal(forbidden.status, 403);

    // 2. Search + filters + no-result
    const searchRes = await fetch(
      `${baseUrl}/admin/participants?search=Raka&faceStatus=REGISTERED`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(searchRes.status, 200);
    const searchText = await searchRes.text();
    assert(!searchText.includes('secret-ciphertext-should-never-leak'));
    assert(!searchText.includes('passwordHash'));
    const searchJson = JSON.parse(searchText) as {
      participants: Array<{ id: string; faceRegistered: boolean }>;
      total: number;
    };
    assert(searchJson.participants.some((item) => item.id === p1.id && item.faceRegistered));

    const emptySearchRes = await fetch(
      `${baseUrl}/admin/participants?search=TIDAKADA_${suffix}`,
      { headers: { Cookie: adminCookie } },
    );
    const emptySearchJson = (await emptySearchRes.json()) as {
      participants: unknown[];
      total: number;
    };
    assert.equal(emptySearchJson.participants.length, 0);
    assert.equal(emptySearchJson.total, 0);

    // 3. Detail view + 404 check
    const detailRes = await fetch(`${baseUrl}/admin/participants/${p1.id}`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(detailRes.status, 200);
    const detailText = await detailRes.text();
    assert(!detailText.includes('secret-ciphertext-should-never-leak'));
    const detailJson = JSON.parse(detailText) as {
      participant: { fullName: string; faceRegistered: boolean };
    };
    assert.equal(detailJson.participant.fullName, 'Raka Pratama');
    assert.equal(detailJson.participant.faceRegistered, true);

    const notFoundDetail = await fetch(
      `${baseUrl}/admin/participants/nonexistent-${suffix}`,
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(notFoundDetail.status, 404);

    // 4. Edit participant + duplicate NIM/email rejection
    const dupRes = await fetch(`${baseUrl}/admin/participants/${p1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        fullName: 'Raka Pratama',
        nimNis: p2.nimNis,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Informatika',
        division: 'Teknologi Informasi',
        phone: '081200001111',
        email: p1.user.email,
        internshipStartDate: '2026-11-01',
        internshipEndDate: '2027-02-01',
      }),
    });
    assert.equal(dupRes.status, 409);

    const editRes = await fetch(`${baseUrl}/admin/participants/${p1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        fullName: 'Raka Pratama Wijaya',
        nimNis: p1.nimNis,
        universitySchool: 'Universitas Sebelas Maret',
        major: 'Teknik Informatika',
        division: 'Operasional',
        phone: '081299990000',
        email: p1.user.email,
        internshipStartDate: '2026-11-01',
        internshipEndDate: '2027-03-01',
      }),
    });
    assert.equal(editRes.status, 200);
    const editJson = (await editRes.json()) as {
      participant: { fullName: string; division: string };
    };
    assert.equal(editJson.participant.fullName, 'Raka Pratama Wijaya');
    assert.equal(editJson.participant.division, 'Operasional');

    // 5. Deactivate participant -> revokes participant session & marks INACTIVE
    const deactivateRes = await fetch(
      `${baseUrl}/admin/participants/${p1.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({ status: 'INACTIVE' }),
      },
    );
    assert.equal(deactivateRes.status, 200);
    const deactivateJson = (await deactivateRes.json()) as {
      participant: { status: string };
    };
    assert.equal(deactivateJson.participant.status, 'INACTIVE');

    const revokedCheck = await fetch(`${baseUrl}/participant/profile`, {
      headers: { Cookie: p1Cookie },
    });
    assert.equal(revokedCheck.status, 401);

    // Reactivate participant -> ACTIVE
    const activateRes = await fetch(
      `${baseUrl}/admin/participants/${p1.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      },
    );
    assert.equal(activateRes.status, 200);

    // 6. Safe Delete: reject when attendance exists, allow when no attendance
    await prisma.attendance.create({
      data: {
        participantId: p1.id,
        attendanceDate: new Date('2099-05-01T00:00:00.000Z'),
        checkInAt: new Date('2099-05-01T01:00:00.000Z'),
        status: 'PRESENT',
        verificationStatus: 'VERIFIED',
      },
    });

    const deleteBlockedRes = await fetch(
      `${baseUrl}/admin/participants/${p1.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
      },
    );
    assert.equal(deleteBlockedRes.status, 409);

    const deleteUnusedRes = await fetch(
      `${baseUrl}/admin/participants/${p2.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
      },
    );
    assert.equal(deleteUnusedRes.status, 200);

    const checkDeletedRes = await fetch(
      `${baseUrl}/admin/participants/${p2.id}`,
      {
        headers: { Cookie: adminCookie },
      },
    );
    assert.equal(checkDeletedRes.status, 404);

    await prisma.attendance.deleteMany({
      where: { participantId: p1.id },
    });

    console.log('SEMUA TEST ADMIN PARTICIPANT MANAGEMENT LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (participantIds.length > 0) {
      await prisma.participant.deleteMany({
        where: { id: { in: participantIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error('Test Admin Participant Management gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
