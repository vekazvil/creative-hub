'use client';

import { MailCheck } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth-client';

const RESEND_COOLDOWN_S = 30;

export function CheckEmail({ email }: { email?: string }) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setLoading(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/verify-email',
    });
    setLoading(false);
    if (error) return toast.error(authErrorMessage(error.code, error.message));
    toast.success('We sent you a new link.');
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <AuthShell
      title="Check your email"
      description={
        email ? (
          <>
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{email}</span>. Open it to finish setting
            up your account.
          </>
        ) : (
          'We sent you a confirmation link. Open it to finish setting up your account.'
        )
      }
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <MailCheck className="size-8" aria-hidden />
      </motion.div>
      <p className="mb-5 text-center text-sm text-muted-foreground">
        The link works for 24 hours. Can’t find it? Check your spam folder.
      </p>
      {email && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={resend}
          loading={loading}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
        </Button>
      )}
    </AuthShell>
  );
}
