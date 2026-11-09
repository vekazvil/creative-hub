import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .pipe(z.email('Enter a valid email address.'));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, 'Use at most 128 characters.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords don’t match.',
  });

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** First error message per field, for showing under each input. */
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const out: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key !== undefined && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}
