import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Confirm email' };

// Better Auth sends the confirmation link here: without ?error the email is confirmed
// and the user is signed in; with ?error the link was invalid or expired.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) redirect('/');

  return (
    <AuthShell
      title="This link has expired"
      description="Confirmation links work for 24 hours and only once. Sign in and we’ll send you a new one."
    >
      <Button asChild className="w-full">
        <Link href="/login">Sign in</Link>
      </Button>
    </AuthShell>
  );
}
