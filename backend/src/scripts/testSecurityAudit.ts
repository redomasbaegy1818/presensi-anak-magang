import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createParticipantWithUser } from '../repositories/participantRepository.js';
import {
  deletePrivateEvidenceFile,
  readPrivateEvidenceFile,
} from '../services/evidenceStorageService.js';
import { createSessionTokenPair, hashPassword } from '../utils/crypto.js';

async function runSecurityAuditChecks() {
  const suffix = Date.now().toString();
  const passwordHash = await hashPassword('SecurityAudit!2026');

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

  try {
    const admin = await prisma.user.create({
      data: {
        email: `sec-admin-${suffix}@example.internal`,
        username: `sec_admin_${suffix}`,
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
      email: `sec-p-${suffix}@example.internal`,
      passwordHash,
      fullName: 'Peserta Uji Keamanan',
      nimNis: `SEC-${suffix}`,
      universitySchool: 'ITB',
      major: 'Informatika',
      division: 'Keamanan Informasi',
      phone: '081200007777',
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

    // 1. Evidence storage path traversal guards
    assert.equal(await readPrivateEvidenceFile('../.env'), null);
    assert.equal(await readPrivateEvidenceFile('..\\package.json'), null);
    assert.equal(await readPrivateEvidenceFile('/etc/passwd'), null);
    assert.equal(await readPrivateEvidenceFile('2026-11/file.jpg\0.png'), null);
    await deletePrivateEvidenceFile('../package.json'); // no-op safe

    // 2. Security headers & Cache-Control: no-store on authenticated endpoints
    const sessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(sessionRes.status, 200);
    assert.equal(sessionRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(sessionRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(
      sessionRes.headers.get('cache-control')?.includes('no-store'),
      true,
    );
    assert.ok(sessionRes.headers.get('content-security-policy'));

    // 3. CSRF Origin / Sec-Fetch-Site / Referer checks
    const badOriginRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example.com',
        Cookie: pCookie,
      },
    });
    assert.equal(badOriginRes.status, 403);

    const nullOriginRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Origin: 'null',
        Cookie: pCookie,
      },
    });
    assert.equal(nullOriginRes.status, 403);

    const crossSiteRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Sec-Fetch-Site': 'cross-site',
        Cookie: pCookie,
      },
    });
    assert.equal(crossSiteRes.status, 403);

    const badRefererRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Referer: 'https://evil.example.com/attack.html',
        Cookie: pCookie,
      },
    });
    assert.equal(badRefererRes.status, 403);

    // 4. Unsafe upload rejected via magic bytes
    const fakeForm = new FormData();
    fakeForm.append(
      'image',
      new Blob(['<html><script>alert(1)</script></html>'], {
        type: 'image/jpeg',
      }),
      'exploit.jpg',
    );
    const badUploadRes = await fetch(`${baseUrl}/face/detect`, {
      method: 'POST',
      headers: { Cookie: pCookie },
      body: fakeForm,
    });
    assert.equal(badUploadRes.status, 400);
    const badUploadJson = (await badUploadRes.json()) as { error: string };
    assert.equal(badUploadJson.error, 'UNSUPPORTED_IMAGE_FORMAT');

    // 5. Cross-role isolation & sensitive field omission
    const participantHitAdmin = await fetch(`${baseUrl}/admin/settings`, {
      headers: { Cookie: pCookie },
    });
    assert.equal(participantHitAdmin.status, 403);

    const adminHitParticipantProfile = await fetch(
      `${baseUrl}/participant/profile`,
      {
        headers: { Cookie: adminCookie },
      },
    );
    assert.equal(adminHitParticipantProfile.status, 403);

    const adminListParticipants = await fetch(`${baseUrl}/admin/participants`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(adminListParticipants.status, 200);
    const listText = await adminListParticipants.text();
    assert.equal(listText.includes('passwordHash'), false);
    assert.equal(listText.includes('encryptedEmbedding'), false);
    assert.equal(listText.includes('encryptionIv'), false);
    assert.equal(listText.includes('encryptionAuthTag'), false);

    // 6. Malformed JSON handled cleanly without stack trace
    const malformedJsonRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    assert.equal(malformedJsonRes.status, 400);
    const malformedBody = (await malformedJsonRes.json()) as { error: string };
    assert.equal(malformedBody.error, 'INVALID_JSON');

    console.log('SEMUA TEST SECURITY AUDIT LOLOS.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (participantId) {
      await prisma.participant.deleteMany({ where: { id: participantId } });
    }
    const uIds = [participantUserId, adminId].filter(
      (id): id is string => Boolean(id),
    );
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
    await prisma.$disconnect();
  }
}

runSecurityAuditChecks().catch(async (error) => {
  console.error('Test Security Audit gagal:', error);
  await prisma.$disconnect();
  process.exit(1);
});
