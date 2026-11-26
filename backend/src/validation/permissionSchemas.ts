import { z } from 'zod';
import { isValidCalendarDate } from './authSchemas.js';

export const participantCreatePermissionSchema = z
  .object({
    type: z.enum(['IZIN', 'SAKIT']),
    startDate: z
      .string()
      .trim()
      .refine(isValidCalendarDate, 'Tanggal mulai izin tidak valid.'),
    endDate: z
      .string()
      .trim()
      .refine(isValidCalendarDate, 'Tanggal selesai izin tidak valid.'),
    reason: z
      .string()
      .trim()
      .min(5, 'Alasan izin minimal 5 karakter.')
      .max(500, 'Alasan izin maksimal 500 karakter.'),
  })
  .superRefine((data, ctx) => {
    if (
      isValidCalendarDate(data.startDate) &&
      isValidCalendarDate(data.endDate)
    ) {
      if (data.endDate < data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
        });
        return;
      }
      const startMs = Date.parse(`${data.startDate}T00:00:00Z`);
      const endMs = Date.parse(`${data.endDate}T00:00:00Z`);
      const diffDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
      if (diffDays > 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Durasi pengajuan izin maksimal 14 hari per pengajuan.',
        });
      }
    }
  });

export const adminPermissionsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).default('ALL'),
  type: z.enum(['ALL', 'IZIN', 'SAKIT']).default('ALL'),
  date: z
    .string()
    .trim()
    .refine(
      (val) => !val || isValidCalendarDate(val),
      'Format tanggal filter tidak valid.',
    )
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminReviewPermissionSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    adminNote: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === 'REJECTED' &&
      (!data.adminNote || data.adminNote.trim().length < 3)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adminNote'],
        message: 'Berikan catatan singkat (minimal 3 karakter) saat menolak izin.',
      });
    }
  });

export type ParticipantCreatePermissionInput = z.infer<
  typeof participantCreatePermissionSchema
>;
export type AdminPermissionsQuery = z.infer<typeof adminPermissionsQuerySchema>;
export type AdminReviewPermissionInput = z.infer<
  typeof adminReviewPermissionSchema
>;
