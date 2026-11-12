import { CUSTOM_TYPE_ID } from '@creative-hub/core';
import { CheckCircle2, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RequestForm } from '@/components/request/request-form';
import { PUBLIC_STEPS } from '@/components/request/steps';
import { Button } from '@/components/ui/button';
import { getApprovers } from '@/lib/approvers';
import { getBrands } from '@/lib/brands';
import { getActiveLink } from '@/lib/public-links';
import { getPublicRequest, PUBLIC_SENDER_NAME } from '@/lib/requests/data';

import { savePublicDraft } from '../../actions';

export const metadata: Metadata = { title: 'Request' };

export default async function PublicRequestPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const link = await getActiveLink(token);
  const base = `/l/${token}`;
  const { request, type, mode, data } = await getPublicRequest(link.id, id);
  const path = type.id === CUSTOM_TYPE_ID ? 'ai' : 'forms';

  if (request.status === 'draft') {
    return (
      <RequestForm
        requestId={id}
        type={type}
        mode={mode}
        initial={data}
        requester={PUBLIC_SENDER_NAME}
        requesterHint="Sent through a shared link. The person who shared it gets your request."
        brands={await getBrands()}
        approvers={await getApprovers()}
        save={savePublicDraft.bind(null, token, id)}
        steps={PUBLIC_STEPS(base, { path, id })}
        stepIndex={2}
        reviewHref={`${base}/r/${id}/review`}
        changeTypeHref={`${base}/${path}`}
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
          {waiting ? 'Sent, waiting for approval' : 'Request sent'}
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
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Keep this page’s link to come back to it.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href={base}>Start another request</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
