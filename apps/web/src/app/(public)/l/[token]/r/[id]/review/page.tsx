import { CUSTOM_TYPE_ID } from '@creative-hub/core';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SendBar } from '@/app/(app)/requests/[id]/review/send-bar';
import { ReviewView } from '@/components/request/review-view';
import { PUBLIC_STEPS } from '@/components/request/steps';
import { getApprovers } from '@/lib/approvers';
import { getBrands } from '@/lib/brands';
import { getActiveLink } from '@/lib/public-links';
import { getPublicRequest, PUBLIC_SENDER_NAME } from '@/lib/requests/data';

import { submitPublicRequest } from '../../../actions';

export const metadata: Metadata = { title: 'Check and send' };

export default async function PublicReviewPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const link = await getActiveLink(token);
  const base = `/l/${token}`;
  const { request, type, mode, data } = await getPublicRequest(link.id, id);
  if (request.status !== 'draft') redirect(`${base}/r/${id}`);
  const path = type.id === CUSTOM_TYPE_ID ? 'ai' : 'forms';

  return (
    <ReviewView
      request={request}
      type={type}
      mode={mode}
      data={data}
      requester={PUBLIC_SENDER_NAME}
      brands={await getBrands()}
      approvers={await getApprovers()}
      steps={PUBLIC_STEPS(base, { path, id })}
      stepIndex={3}
      editHref={`${base}/r/${id}`}
      sendBar={(missing, urgent) => (
        <SendBar
          id={id}
          missing={missing}
          urgent={urgent}
          submit={submitPublicRequest.bind(null, token)}
          backHref={`${base}/r/${id}`}
        />
      )}
    />
  );
}
