import { z } from 'zod';

export const attendanceMarkBodySchema = z.object({
  type: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
});

export const attendanceHistoryQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Format filter bulan harus YYYY-MM.')
    .optional(),
});
