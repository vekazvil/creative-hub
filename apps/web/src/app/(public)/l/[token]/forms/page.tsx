import type { Metadata } from 'next';

import { getActiveLink } from '@/lib/public-links';

import { PickForm } from './pick-form';

export const metadata: Metadata = { title: 'Pick a form' };

export default async function PickFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await getActiveLink(token);
  return <PickForm token={token} />;
}
