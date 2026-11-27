import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST.trim());
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createSmtpTransporter() {
  return nodemailer.createTransport({
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
}

function getFromAddress(): string {
  return (
    env.SMTP_FROM.trim() ||
    env.SMTP_USER.trim() ||
    'no-reply@presensi-magang.local'
  );
}

function buildResetEmailHtml(input: {
  recipientName: string;
  portalLabel: string;
  verificationCode: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const safeName = escapeHtml(input.recipientName);
  const safePortal = escapeHtml(input.portalLabel);
  const safeCode = escapeHtml(input.verificationCode);
  const safeUrl = escapeHtml(input.resetUrl);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifikasi Reset Kata Sandi</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6f8;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-top:4px solid #991b1b;border-radius:10px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#991b1b;">
          Presensi Magang · ${safePortal}
        </p>
        <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#111827;">
          Verifikasi Pengaturan Ulang Kata Sandi
        </h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#374151;">
          Halo <strong>${safeName}</strong>,
        </p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151;">
          Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Anda dapat memasukkan <strong>kode verifikasi 6 digit</strong> berikut langsung di halaman Lupa Kata Sandi, atau menekan tombol verifikasi langsung di bawah ini.
        </p>

        <div style="margin:0 0 20px;padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
            Kode Verifikasi Anda
          </p>
          <p style="margin:0;font-size:30px;font-weight:700;letter-spacing:0.25em;font-family:Consolas,Monaco,monospace;color:#111827;">
            ${safeCode}
          </p>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
          <tr>
            <td align="center">
              <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background-color:#991b1b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
                Ubah Kata Sandi Sekarang
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#6b7280;">
          Kode dan tautan ini berlaku selama <strong>${input.expiresInMinutes} menit</strong> dan hanya dapat dipakai satu kali. Jika tombol di atas tidak berfungsi, salin tautan berikut ke browser Anda:
        </p>
        <p style="margin:0 0 16px;font-size:12px;line-height:1.5;word-break:break-all;color:#991b1b;">
          <a href="${safeUrl}" style="color:#991b1b;">${safeUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
          Jika Anda tidak mengajukan permintaan ini, abaikan email ini. Kata sandi akun Anda tidak akan berubah tanpa verifikasi.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function verifySmtpConnection(): Promise<{
  configured: boolean;
  ok: boolean;
  message: string;
}> {
  if (!isSmtpConfigured()) {
    return {
      configured: false,
      ok: false,
      message: 'SMTP_HOST belum diisi pada backend/.env.',
    };
  }

  const transporter = createSmtpTransporter();
  await transporter.verify();
  return {
    configured: true,
    ok: true,
    message: `Koneksi SMTP ke ${env.SMTP_HOST.trim()}:${env.SMTP_PORT} berhasil diverifikasi.`,
  };
}

export async function sendPasswordResetEmail(input: {
  to: string;
  recipientName: string;
  portal: 'PARTICIPANT' | 'ADMIN';
  verificationCode: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<{ deliveredBy: 'smtp' | 'dev_console' | 'skipped' }> {
  const portalLabel =
    input.portal === 'ADMIN' ? 'Portal Administrator' : 'Portal Peserta Magang';

  if (isSmtpConfigured()) {
    const transporter = createSmtpTransporter();

    await transporter.sendMail({
      from: getFromAddress(),
      to: input.to,
      subject: `${input.verificationCode} — Kode Verifikasi Reset Kata Sandi (Presensi Magang)`,
      text: [
        `Halo ${input.recipientName},`,
        '',
        `Kami menerima permintaan pengaturan ulang kata sandi untuk akun ${portalLabel} Anda.`,
        '',
        `Kode Verifikasi 6 Digit: ${input.verificationCode}`,
        `Atau buka tautan langsung berikut (berlaku ${input.expiresInMinutes} menit):`,
        input.resetUrl,
        '',
        'Jika Anda tidak merasa mengajukan permintaan ini, abaikan email ini.',
      ].join('\n'),
      html: buildResetEmailHtml({
        recipientName: input.recipientName,
        portalLabel,
        verificationCode: input.verificationCode,
        resetUrl: input.resetUrl,
        expiresInMinutes: input.expiresInMinutes,
      }),
    });

    return { deliveredBy: 'smtp' };
  }

  if (env.NODE_ENV !== 'production') {
    console.info(
      [
        `[PASSWORD RESET DEV] (${portalLabel}) -> ${input.to}`,
        `  Kode 6 Digit   : ${input.verificationCode}`,
        `  Tautan Langsung: ${input.resetUrl}`,
        `  Masa Berlaku   : ${input.expiresInMinutes} menit`,
      ].join('\n'),
    );
    return { deliveredBy: 'dev_console' };
  }

  console.warn(
    `[PASSWORD RESET] SMTP belum dikonfigurasi pada mode produksi; email reset ke ${input.to} tidak terkirim.`,
  );
  return { deliveredBy: 'skipped' };
}
