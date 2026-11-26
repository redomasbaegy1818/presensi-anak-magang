import { z } from 'zod';

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

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
