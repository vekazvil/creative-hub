import 'server-only';

import type { Approver } from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { asc, eq } from 'drizzle-orm';
import { cache } from 'react';

import { getDb } from './db';

const { approvers } = schema;

export interface ApproverInput {
  name: string;
  email: string;
  title?: string;
}

/** Everyone, removed ones included (so past requests still show names). Once per request. */
export const getApprovers = cache(async (): Promise<Approver[]> => {
  const rows = await getDb().select().from(approvers).orderBy(asc(approvers.name));
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    ...(r.title && { title: r.title }),
    active: r.active,
  }));
});

/** Active approvers with their row ids, for the Approvers page. */
export async function listActiveApprovers() {
  return getDb()
    .select({
      id: approvers.id,
      name: approvers.name,
      email: approvers.email,
      title: approvers.title,
    })
    .from(approvers)
    .where(eq(approvers.active, true))
    .orderBy(asc(approvers.name));
}

/** Adds someone, or brings back a removed approver with the same email. */
export async function addApprover(input: ApproverInput, by: string) {
  const values = {
    name: input.name,
    email: input.email.toLowerCase(),
    title: input.title || null,
    active: true,
  };
  const [existing] = await getDb()
    .select({ active: approvers.active })
    .from(approvers)
    .where(eq(approvers.email, values.email))
    .limit(1);
  if (existing?.active) return { ok: false as const, error: 'This email is already on the list.' };
  await getDb()
    .insert(approvers)
    .values({ ...values, createdByEmail: by })
    .onConflictDoUpdate({ target: approvers.email, set: values });
  return { ok: true as const };
}

export async function updateApprover(id: string, input: Omit<ApproverInput, 'email'>) {
  await getDb()
    .update(approvers)
    .set({ name: input.name, title: input.title || null })
    .where(eq(approvers.id, id));
}

/** Takes someone off the list. Requests that already name them keep the name. */
export async function removeApprover(id: string) {
  await getDb().update(approvers).set({ active: false }).where(eq(approvers.id, id));
}
