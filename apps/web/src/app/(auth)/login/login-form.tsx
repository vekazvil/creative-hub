'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormAlert } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { safeRedirect } from '@/lib/safe-redirect';
import { fieldErrors, signInSchema, type FieldErrors } from '@/lib/validation';

type Values = { email: string; password: string };

export function LoginForm({ next, passwordReset }: { next?: string; passwordReset?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<Values>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setLoading(true);
    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      setLoading(false);
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
        return;
      }
      return setFormError(authErrorMessage(error.code, error.message));
    }
    router.replace(safeRedirect(next));
    router.refresh();
  }

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back. Sign in to send and follow your requests."
      footer={
        <>
          New to Creative Hub?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert
          tone="info"
          message={
            passwordReset ? 'Your password is changed. Sign in with the new one.' : undefined
          }
        />
        <FormAlert message={formError} />
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder="name@company.com"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          aside={
            <Link
              href={`/forgot-password${values.email ? `?email=${encodeURIComponent(values.email)}` : ''}`}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          }
        />
        <Button type="submit" className="mt-2 w-full" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
