'use client';

import { Send } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { submitRequest } from '../../actions';

export function SendBar({
  id,
  missing,
  urgent,
  submit = submitRequest,
  backHref = `/requests/${id}`,
}: {
  id: string;
  missing: string[];
  urgent: boolean;
  /** Sends the request; returns the empty required questions when it can't. */
  submit?: (id: string) => Promise<{ ok: false; missing: string[] } | undefined | void>;
  backHref?: string;
}) {
  const [pending, start] = useTransition();
  const [serverMissing, setServerMissing] = useState<string[]>();
  const left = serverMissing ?? missing;

  function send() {
    start(async () => {
      const res = await submit(id);
      if (res && !res.ok) {
        setServerMissing(res.missing);
        toast.error(
          `${res.missing.length} required ${res.missing.length === 1 ? 'question is' : 'questions are'} still empty.`,
        );
      }
    });
  }

  return (
    <div className="sticky bottom-0 z-30 mx-[calc(50%-50vw)] mt-10 w-screen border-t border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">
          {left.length > 0
            ? `${left.length} required ${left.length === 1 ? 'question' : 'questions'} left.`
            : urgent
              ? 'Under 5 working days: the PM or creative manager approves first.'
              : 'Everything required is answered.'}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={backHref}>Back to details</Link>
          </Button>
          <Button onClick={send} loading={pending} disabled={left.length > 0}>
            {!pending && <Send aria-hidden />}
            Send request
          </Button>
        </div>
      </div>
    </div>
  );
}
