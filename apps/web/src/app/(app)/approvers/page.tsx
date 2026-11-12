import type { Metadata } from 'next';

import { listActiveApprovers } from '@/lib/approvers';
import { requireSession } from '@/lib/session';

import { AddApprover, ApproverRow } from './approvers';

export const metadata: Metadata = { title: 'Approvers' };

export default async function ApproversPage() {
  await requireSession();
  const people = await listActiveApprovers();

  return (
    <main className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
      <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">Approvers</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
        The people who sign off requests. Requesters pick one of them in the form. Removing someone
        keeps their name on requests that already have it.
      </p>

      <AddApprover />

      {people.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-input p-8 text-center text-[15px] text-muted-foreground">
          No approvers yet. Add the first one above.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-(--shadow-card)">
          {people.map((p) => (
            <li key={p.id}>
              <ApproverRow approver={p} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
