'use client';

import { MailCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormAlert } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { fieldErrors, forgotPasswordSchema } from '@/lib/validation';

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);

    setLoading(true);
    const res = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    });
    setLoading(false);
    if (res.error) return setFormError(authErrorMessage(res.error.code, res.error.message));
    setSentTo(parsed.data.email);
  }

  return (
    <AuthShell
      title={sentTo ? 'Check your email' : 'Forgot your password?'}
      description={
        sentTo ? (
          <>
            If there’s an account for <span className="font-medium text-foreground">{sentTo}</span>,
            we sent a link to choose a new password. It works for 1 hour.
          </>
        ) : (
          'Enter your email and we’ll send you a link to choose a new one.'
        )
      }
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <MailCheck className="size-8" aria-hidden />
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setSentTo(undefined)}>
              Use a different email
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <FormAlert message={formError} />
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(undefined);
              }}
              error={error}
            />
            <Button type="submit" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
