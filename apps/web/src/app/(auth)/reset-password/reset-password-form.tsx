'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormAlert } from '@/components/auth/field';
import { PasswordChecklist } from '@/components/auth/password-checklist';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { fieldErrors, resetPasswordSchema, type FieldErrors } from '@/lib/validation';

type Values = { password: string; confirm: string };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ password: '', confirm: '' });
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
    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token });
    setLoading(false);
    if (error) return setFormError(authErrorMessage(error.code, error.message));
    router.replace('/login?reset=1');
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="You’ll be signed out on other devices."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />
        <Field
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          autoFocus
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={<PasswordChecklist password={values.password} />}
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" className="mt-2 w-full" loading={loading}>
          Save new password
        </Button>
      </form>
    </AuthShell>
  );
}
