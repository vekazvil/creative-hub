import type { Metadata } from 'next';

import { getActiveLink } from '@/lib/public-links';

import { StartChoice } from './start-choice';

export const metadata: Metadata = { title: 'Start a request' };

export default async function StartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await getActiveLink(token);
  return <StartChoice base={`/l/${token}`} />;
}
