import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../utils/crypto.js';

async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const username = process.env.ADMIN_SEED_USERNAME?.trim() || null;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error(
      'Set ADMIN_SEED_EMAIL dan ADMIN_SEED_PASSWORD (minimal 8 karakter) pada environment sebelum menjalankan seed admin.',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ADMIN_SEED_PASSWORD minimal 8 karakter.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      username,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    update: {
      username,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  console.log('Admin siap digunakan:', admin);
  await prisma.$disconnect();
}

seedAdmin().catch(async (error) => {
  console.error('Gagal membuat admin:', error);
  await prisma.$disconnect();
  process.exit(1);
});
