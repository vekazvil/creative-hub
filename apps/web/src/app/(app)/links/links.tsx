'use client';

import { CUSTOM_TYPE_ID, getWorkType, type RequestStatus } from '@creative-hub/core';
import { Check, ChevronDown, Copy, ExternalLink, Link2, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/request/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { createLink, setLinkActive } from './actions';

/** `focus`: opened from the header's "New public link", so the label field is ready to type in. */
export function CreateLink({ focus = false }: { focus?: boolean }) {
  const [label, setLabel] = useState('');
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-8 flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-(--shadow-card) sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await createLink(label);
          setLabel('');
          toast.success('Link created. Copy it and share it.');
        });
      }}
    >
      <label htmlFor="link-label" className="sr-only">
        What the link is for
      </label>
      <Input
        id="link-label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={80}
        autoFocus={focus}
        placeholder="What it’s for, e.g. H-E-B team or Pizza Expo agency"
        className="sm:flex-1"
      />
      <Button type="submit" loading={pending}>
        {!pending && <Plus aria-hidden />}
        Create link
      </Button>
    </form>
  );
}

interface LinkView {
  id: string;
  label: string | null;
  url: string;
  active: boolean;
  createdAt: string;
  started: number;
  sent: number;
  requests: {
    id: string;
    title: string | null;
    workType: string;
    status: string;
    updatedAt: string;
  }[];
}

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const typeName = (id: string) =>
  id === CUSTOM_TYPE_ID ? 'Form built by AI' : (getWorkType(id)?.name ?? id);

export function LinkCard({ link }: { link: LinkView }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [toggling, startToggle] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Couldn’t copy. Select the link and copy it by hand.');
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl bg-card p-6 shadow-(--shadow-card) transition-opacity sm:p-7',
        !link.active && 'opacity-75',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <h2 className="truncate text-[19px] font-semibold">{link.label || 'Untitled link'}</h2>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                link.active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground',
              )}
            >
              {link.active ? 'On' : 'Off'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {day.format(new Date(link.createdAt))}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={toggling}
          onClick={() =>
            startToggle(async () => {
              await setLinkActive(link.id, !link.active);
              toast.success(
                link.active ? 'Link turned off. It no longer opens.' : 'Link is on again.',
              );
            })
          }
        >
          {link.active ? 'Turn off' : 'Turn on'}
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5 pl-4">
        <code
          className={cn(
            'min-w-0 flex-1 truncate text-[14px]',
            !link.active && 'text-muted-foreground line-through',
          )}
        >
          {link.url}
        </code>
        {link.active && (
          <>
            <Button variant="ghost" size="icon" asChild aria-label="Open the link">
              <a href={link.url} target="_blank" rel="noreferrer">
                <ExternalLink />
              </a>
            </Button>
            <Button size="sm" onClick={copy} aria-live="polite">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <dl className="flex gap-6 text-[15px]">
          <div>
            <dt className="text-xs text-muted-foreground">Started</dt>
            <dd className="font-semibold">{link.started}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sent</dt>
            <dd className="font-semibold">{link.sent}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Not sent yet</dt>
            <dd className="font-semibold">{link.started - link.sent}</dd>
          </div>
        </dl>
        {link.requests.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Hide requests' : `Show requests (${link.requests.length})`}
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {link.requests.map((r) => (
              <li key={r.id} className="border-t border-border first:mt-3">
                <Link
                  href={`/requests/${r.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate text-[15px] font-medium',
                        !r.title && 'text-muted-foreground',
                      )}
                    >
                      {r.title || 'Untitled request'}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {typeName(r.workType)} · updated {day.format(new Date(r.updatedAt))}
                    </span>
                  </span>
                  <StatusBadge status={r.status as RequestStatus} />
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </article>
  );
}
