import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ReviewView } from '@/components/request/review-view';
import { REQUEST_STEPS } from '@/components/request/steps';
import { getApprovers } from '@/lib/approvers';
import { getBrands } from '@/lib/brands';
import { getOwnRequest } from '@/lib/requests/data';
import { requireSession } from '@/lib/session';

import { SendBar } from './send-bar';

export const metadata: Metadata = { title: 'Check and send' };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSession();
  const { request, type, mode, data } = await getOwnRequest(id, user.email);
  if (request.status !== 'draft') redirect(`/requests/${id}`);

  return (
    <ReviewView
      request={request}
      type={type}
      mode={mode}
      data={data}
      requester={user.name}
      brands={await getBrands()}
      approvers={await getApprovers()}
      steps={REQUEST_STEPS(id)}
      stepIndex={2}
      editHref={`/requests/${id}`}
      sendBar={(missing, urgent) => <SendBar id={id} missing={missing} urgent={urgent} />}
    />
  );
}
