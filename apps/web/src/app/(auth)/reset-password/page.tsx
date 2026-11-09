import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';

import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error || !token) {
    return (
      <AuthShell
        title="This link has expired"
        description="Reset links work for 1 hour and only once. Ask for a new one and use the latest email."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
      </AuthShell>
    );
  }
  return <ResetPasswordForm token={token} />;
}
