import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST.trim());
}

export async function sendPasswordResetEmail(input: {
  to: string;
  recipientName: string;
  portal: 'PARTICIPANT' | 'ADMIN';
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<{ deliveredBy: 'smtp' | 'dev_console' | 'skipped' }> {
  const portalLabel =
    input.portal === 'ADMIN' ? 'Portal Administrator' : 'Portal Peserta Magang';

  if (isSmtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST.trim(),
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      auth:
        env.SMTP_USER.trim() && env.SMTP_PASS
          ? {
              user: env.SMTP_USER.trim(),
              pass: env.SMTP_PASS,
            }
          : undefined,
    });

    const fromAddress =
      env.SMTP_FROM.trim() || env.SMTP_USER.trim() || 'no-reply@presensi-magang.local';

    await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: `Reset Kata Sandi — Presensi Magang (${portalLabel})`,
      text: [
        `Halo ${input.recipientName},`,
        '',
        `Kami menerima permintaan pengaturan ulang kata sandi untuk akun ${portalLabel} Anda.`,
        `Silakan buka tautan berikut dalam ${input.expiresInMinutes} menit untuk membuat kata sandi baru:`,
        '',
        input.resetUrl,
        '',
        'Jika Anda tidak merasa mengajukan permintaan ini, abaikan email ini.',
      ].join('\n'),
    });

    return { deliveredBy: 'smtp' };
  }

  if (env.NODE_ENV !== 'production') {
    console.info(
      `[PASSWORD RESET DEV LINK] (${portalLabel}) -> ${input.to}: ${input.resetUrl} (berlaku ${input.expiresInMinutes} menit)`,
    );
    return { deliveredBy: 'dev_console' };
  }

  console.warn(
    `[PASSWORD RESET] SMTP belum dikonfigurasi pada mode produksi; email reset ke ${input.to} tidak terkirim.`,
  );
  return { deliveredBy: 'skipped' };
}
