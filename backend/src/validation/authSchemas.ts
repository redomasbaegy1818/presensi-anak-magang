import { z } from 'zod';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^(?:\+62|62|0)[0-9\s-]{8,16}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_ONLY_REGEX.test(dateStr)) return false;
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function normalizePhone(rawPhone: string): string {
  return rawPhone.replace(/[\s-]+/g, '').trim();
}

export const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email atau username wajib diisi.')
    .max(255, 'Email atau username terlalu panjang.'),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi.')
    .max(256, 'Kata sandi terlalu panjang.'),
});

export const participantLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.')
    .max(255, 'Email terlalu panjang.'),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi.')
    .max(256, 'Kata sandi terlalu panjang.'),
});

export const participantRegisterSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(120, 'Nama lengkap maksimal 120 karakter.'),
    nimNis: z
      .string()
      .trim()
      .min(3, 'NIM/NIS minimal 3 karakter.')
      .max(50, 'NIM/NIS maksimal 50 karakter.'),
    universitySchool: z
      .string()
      .trim()
      .min(2, 'Universitas atau sekolah wajib diisi.')
      .max(150, 'Nama universitas/sekolah terlalu panjang.'),
    major: z
      .string()
      .trim()
      .min(2, 'Jurusan wajib diisi.')
      .max(120, 'Jurusan terlalu panjang.'),
    division: z
      .string()
      .trim()
      .min(2, 'Divisi penempatan wajib dipilih.')
      .max(100, 'Nama divisi terlalu panjang.'),
    phone: z
      .string()
      .trim()
      .refine(
        (val) => {
          const digits = normalizePhone(val);
          return PHONE_REGEX.test(digits) && digits.replace(/\D/g, '').length >= 9 && digits.replace(/\D/g, '').length <= 15;
        },
        'Nomor HP tidak valid (gunakan 9–15 digit, contoh: 081234567890).',
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Email wajib diisi.')
      .email('Format email tidak valid.')
      .max(255, 'Email terlalu panjang.'),
    internshipStartDate: z
      .string()
      .trim()
      .refine(isValidCalendarDate, 'Tanggal mulai magang tidak valid.'),
    internshipEndDate: z
      .string()
      .trim()
      .refine(isValidCalendarDate, 'Tanggal selesai magang tidak valid.'),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter.')
      .max(256, 'Kata sandi terlalu panjang.'),
  })
  .superRefine((data, ctx) => {
    if (
      isValidCalendarDate(data.internshipStartDate) &&
      isValidCalendarDate(data.internshipEndDate) &&
      data.internshipEndDate < data.internshipStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internshipEndDate'],
        message: 'Tanggal selesai magang tidak boleh lebih awal dari tanggal mulai.',
      });
    }
  });

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ParticipantLoginInput = z.infer<typeof participantLoginSchema>;
export type ParticipantRegisterInput = z.infer<typeof participantRegisterSchema>;
