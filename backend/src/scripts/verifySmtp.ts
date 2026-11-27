import { sendPasswordResetEmail, verifySmtpConnection } from '../services/mailerService.js';

async function main() {
  const testRecipient = process.argv[2]?.trim();
  const status = await verifySmtpConnection();
  console.log(status.message);

  if (!status.ok) {
    process.exit(1);
  }

  if (testRecipient) {
    const result = await sendPasswordResetEmail({
      to: testRecipient,
      recipientName: 'Pengguna Uji SMTP',
      portal: 'PARTICIPANT',
      verificationCode: '123456',
      resetUrl: 'http://localhost:5173/reset-password?token=contoh-uji-smtp',
      expiresInMinutes: 30,
    });
    console.log(
      `Email uji coba dikirim ke ${testRecipient} melalui ${result.deliveredBy}.`,
    );
  }
}

main().catch((error) => {
  console.error('Verifikasi SMTP gagal:', error);
  process.exit(1);
});
