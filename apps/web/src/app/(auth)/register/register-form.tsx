'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormAlert } from '@/components/auth/field';
import { PasswordChecklist } from '@/components/auth/password-checklist';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { fieldErrors, signUpSchema, type FieldErrors } from '@/lib/validation';

type Values = { name: string; email: string; password: string };

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '' });
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
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: '/verify-email',
    });
    setLoading(false);
    if (error) return setFormError(authErrorMessage(error.code, error.message));
    router.push(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
  }

  return (
    <AuthShell
      title="Create your account"
      description="Use your company email. We’ll send a link to confirm it."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          autoFocus
          placeholder="Lucia Ramos"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
        />
        <Field
          label="Work email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@company.com"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={<PasswordChecklist password={values.password} />}
        />
        <Button type="submit" className="mt-2 w-full" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
