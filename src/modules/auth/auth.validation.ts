import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    identifier: z.string().min(1).optional(),
    password: z.string().min(8)
  })
  .transform((value) => ({
    identifier: value.email ?? value.identifier ?? '',
    password: value.password
  }))
  .refine((value) => value.identifier.length > 0, {
    message: 'Email is required',
    path: ['email']
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});