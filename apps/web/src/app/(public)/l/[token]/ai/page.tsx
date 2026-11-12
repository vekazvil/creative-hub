import type { Metadata } from 'next';

import { getActiveLink } from '@/lib/public-links';

import { DescribeForm } from './describe-form';

export const metadata: Metadata = { title: 'Let AI build the form' };

export default async function DescribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await getActiveLink(token);
  return <DescribeForm token={token} />;
}
