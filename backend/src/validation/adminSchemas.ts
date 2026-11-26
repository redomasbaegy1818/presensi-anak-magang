import { z } from 'zod';
import { validateAttendanceRuleLogic } from '../services/attendanceRules.js';
import {
  isValidCalendarDate,
  normalizePhone,
  PHONE_REGEX,
} from './authSchemas.js';

export const adminParticipantsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
  division: z.string().trim().max(100).optional(),
  faceStatus: z.enum(['ALL', 'REGISTERED', 'UNREGISTERED']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUpdateParticipantSchema = z
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
          return (
            PHONE_REGEX.test(digits) &&
            digits.replace(/\D/g, '').length >= 9 &&
            digits.replace(/\D/g, '').length <= 15
          );
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

export const adminParticipantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

const DATE_FILTER_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const adminAttendanceQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  participantId: z.string().trim().max(100).optional(),
  date: z
    .string()
    .trim()
    .refine(
      (val) => !val || DATE_FILTER_REGEX.test(val),
      'Format tanggal harus YYYY-MM-DD.',
    )
    .optional(),
  status: z.enum(['ALL', 'PRESENT', 'LATE', 'ABSENT']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCorrectAttendanceSchema = z
  .object({
    status: z.enum(['PRESENT', 'LATE', 'ABSENT']),
    checkInTime: z
      .string()
      .trim()
      .refine(
        (val) => val === '' || TIME_HHMM_REGEX.test(val),
        'Format jam masuk harus HH:mm.',
      )
      .nullable()
      .optional(),
    checkOutTime: z
      .string()
      .trim()
      .refine(
        (val) => val === '' || TIME_HHMM_REGEX.test(val),
        'Format jam pulang harus HH:mm.',
      )
      .nullable()
      .optional(),
    reason: z
      .string()
      .trim()
      .min(5, 'Alasan koreksi minimal 5 karakter.')
      .max(500, 'Alasan koreksi maksimal 500 karakter.'),
  })
  .superRefine((data, ctx) => {
    const inVal =
      typeof data.checkInTime === 'string' && data.checkInTime !== ''
        ? data.checkInTime
        : null;
    const outVal =
      typeof data.checkOutTime === 'string' && data.checkOutTime !== ''
        ? data.checkOutTime
        : null;

    if (outVal && !inVal && data.checkInTime === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkOutTime'],
        message: 'Jam pulang tidak dapat diisi jika jam masuk dikosongkan.',
      });
    }
    if (inVal && outVal && outVal < inVal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkOutTime'],
        message: 'Jam pulang tidak boleh lebih awal dari jam masuk.',
      });
    }
  });

export const adminEvidenceParamsSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']),
});

const REPORT_TYPES = ['daily', 'weekly', 'monthly', 'participant'] as const;

export const adminReportQuerySchema = z
  .object({
    reportType: z.enum(REPORT_TYPES).default('monthly'),
    startDate: z
      .string()
      .trim()
      .refine(
        (val) => !val || isValidCalendarDate(val),
        'Format tanggal mulai harus YYYY-MM-DD yang valid.',
      )
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine(
        (val) => !val || isValidCalendarDate(val),
        'Format tanggal akhir harus YYYY-MM-DD yang valid.',
      )
      .optional(),
    participantId: z.string().trim().max(100).optional(),
    division: z.string().trim().max(100).optional(),
    status: z.enum(['ALL', 'PRESENT', 'LATE', 'ABSENT']).default('ALL'),
  })
  .superRefine((data, ctx) => {
    const start = data.startDate?.trim() || '';
    const end = data.endDate?.trim() || '';
    if (start && end) {
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai.',
        });
        return;
      }
      const startMs = Date.parse(`${start}T00:00:00Z`);
      const endMs = Date.parse(`${end}T00:00:00Z`);
      const diffDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
      if (diffDays > 366) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Rentang tanggal laporan maksimal 366 hari.',
        });
      }
    }
  });

export const adminReportExportQuerySchema = adminReportQuerySchema.and(
  z.object({
    format: z.enum(['xlsx', 'pdf']),
  }),
);

export const adminUpdateSettingsSchema = z
  .object({
    checkInStartTime: z.string().trim(),
    workStartTime: z.string().trim(),
    lateToleranceMinutes: z.coerce
      .number()
      .int('Toleransi keterlambatan harus berupa bilangan bulat (menit).'),
    workEndTime: z.string().trim(),
    checkOutEndTime: z.string().trim(),
    saveEvidence: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const issues = validateAttendanceRuleLogic(data);
    for (const issue of issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [issue.field],
        message: issue.message,
      });
    }
  });

export type AdminParticipantsQuery = z.infer<typeof adminParticipantsQuerySchema>;
export type AdminUpdateParticipantInput = z.infer<
  typeof adminUpdateParticipantSchema
>;
export type AdminParticipantStatusInput = z.infer<
  typeof adminParticipantStatusSchema
>;
export type AdminAttendanceQuery = z.infer<typeof adminAttendanceQuerySchema>;
export type AdminCorrectAttendanceInput = z.infer<
  typeof adminCorrectAttendanceSchema
>;
export type AdminReportQuery = z.infer<typeof adminReportQuerySchema>;
export type AdminReportExportQuery = z.infer<
  typeof adminReportExportQuerySchema
>;
export type AdminUpdateSettingsInput = z.infer<
  typeof adminUpdateSettingsSchema
>;
