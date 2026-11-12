'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { addApprover, removeApprover, updateApprover } from '@/lib/approvers';
import { requireSession } from '@/lib/session';

const fields = z.object({
  name: z.string().trim().min(1, 'Add a name.').max(120),
  title: z.string().trim().max(120).optional(),
});

export async function createApprover(input: { name: string; email: string; title?: string }) {
  const { user } = await requireSession();
  const parsed = fields
    .extend({ email: z.email('Add a valid email.').trim() })
    .safeParse({ ...input, email: input.email.trim() });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]!.message };
  const res = await addApprover(parsed.data, user.email);
  if (res.ok) revalidatePath('/approvers');
  return res;
}

export async function editApprover(id: string, input: { name: string; title?: string }) {
  await requireSession();
  const parsed = fields.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]!.message };
  await updateApprover(z.uuid().parse(id), parsed.data);
  revalidatePath('/approvers');
  return { ok: true as const };
}

export async function deleteApprover(id: string) {
  await requireSession();
  await removeApprover(z.uuid().parse(id));
  revalidatePath('/approvers');
}
