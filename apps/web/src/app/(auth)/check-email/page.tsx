import type { Metadata } from 'next';

import { CheckEmail } from './check-email';

export const metadata: Metadata = { title: 'Check your email' };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <CheckEmail email={email} />;
}
