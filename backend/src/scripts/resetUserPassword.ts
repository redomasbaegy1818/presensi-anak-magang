import { prisma } from '../lib/prisma.js';
import { findUserByIdentifier } from '../repositories/authRepository.js';
import { hashPassword } from '../utils/crypto.js';

async function main() {
  const [identifier, newPassword] = process.argv.slice(2);

  if (!identifier || !newPassword || newPassword.length < 8) {
    console.error(
      'Penggunaan: npm run db:reset-password -- <email-atau-username> <kata-sandi-baru-min-8-karakter>',
    );
    process.exit(1);
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    console.error(`Pengguna "${identifier}" tidak ditemukan.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await tx.session.deleteMany({
      where: { userId: user.id },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  console.log(
    `Kata sandi untuk ${user.email} (${user.role}) berhasil direset dan seluruh sesi lama telah dihentikan.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
