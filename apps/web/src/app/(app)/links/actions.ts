'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createPublicLink, setPublicLinkActive } from '@/lib/public-links';
import { requireSession } from '@/lib/session';

export async function createLink(label: string) {
  const { user } = await requireSession();
  const parsed = z.string().trim().max(80).parse(label);
  const link = await createPublicLink(user.email, parsed);
  revalidatePath('/links');
  return { token: link.token };
}

export async function setLinkActive(id: string, active: boolean) {
  const { user } = await requireSession();
  await setPublicLinkActive(z.uuid().parse(id), user.email, active);
  revalidatePath('/links');
}
