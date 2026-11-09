import { CheckCircle2, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RequestForm } from '@/components/request/request-form';
import { StatusBadge } from '@/components/request/status-badge';
import { Button } from '@/components/ui/button';
import { getBrands } from '@/lib/brands';
import { getOwnRequest } from '@/lib/requests/data';
import { requireSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Request' };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSession();
  const { request, type, mode, data } = await getOwnRequest(id, user.email);

  if (request.status === 'draft') {
    return (
      <RequestForm
        requestId={id}
        type={type}
        mode={mode}
        initial={data}
        requester={user.name}
        brands={await getBrands()}
      />
    );
  }

  const waiting = request.status === 'pending_approval';
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl bg-card p-8 shadow-(--shadow-card) sm:p-10">
        <div
          className={`flex size-14 items-center justify-center rounded-full ${waiting ? 'bg-[#fff4e5] text-[#b25000]' : 'bg-success/10 text-success'}`}
        >
          {waiting ? <Clock className="size-7" /> : <CheckCircle2 className="size-7" />}
        </div>
        <h1 className="mt-6 text-[28px] leading-tight font-semibold">
          {waiting ? 'Sent — waiting for approval' : 'Request sent'}
        </h1>
        <p className="mt-2 text-[17px] text-muted-foreground">
          {waiting
            ? 'The deadline is under 5 working days, so the PM or creative manager approves it before the creative team starts.'
            : 'The creative team has your brief.'}
        </p>
        <dl className="mt-8 divide-y divide-border rounded-2xl border border-border">
          {[
            ['Title', request.title ?? 'Untitled'],
            ['Type', `${type.name}${mode === 'update' ? ' · update' : ''}`],
            ['Status', <StatusBadge key="s" status={request.status} />],
          ].map(([k, v]) => (
            <div
              key={String(k)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Next: a project number, a Monday item, a Drive folder with the brief, a Slack channel and
          an email to you with the links. These are set up automatically once the connections are
          live.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/requests/new">Start another request</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/requests">My requests</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
