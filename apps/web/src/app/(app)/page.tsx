import type { RequestStatus } from '@creative-hub/core';
import { ArrowRight, ChevronRight, ClipboardList, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { listOwnRequests } from '@/lib/requests/data';
import { requireSession } from '@/lib/session';

import { DescribeBox } from './describe-box';

function greeting(date = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Chicago',
    }).format(date),
  );
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const actions = [
  {
    href: '/requests/new',
    icon: Plus,
    title: 'New request',
    text: 'Pick what you need, or describe it and we’ll suggest the form.',
    cta: 'Start a request',
  },
  {
    href: '/chat',
    icon: Sparkles,
    title: 'Describe it in a chat',
    text: 'Tell us what you need. We ask only what’s missing and fill in the form.',
    cta: 'Open the chat',
  },
];

const ACTIVE: RequestStatus[] = [
  'submitted',
  'pending_approval',
  'approved',
  'creating',
  'created',
  'failed',
];

export default async function HomePage() {
  const { user } = await requireSession();
  const first = user.name.split(' ')[0];
  const rows = await listOwnRequests(user.email);
  const counts = [
    { label: 'Drafts', value: rows.filter((r) => r.status === 'draft').length, tab: 'drafts' },
    {
      label: 'In progress',
      value: rows.filter((r) => ACTIVE.includes(r.status)).length,
      tab: 'active',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-4 sm:px-6 sm:pt-7 sm:pb-3">
      <h1 className="text-[30px] leading-tight font-semibold sm:text-[34px]">
        {greeting()}, {first}.
      </h1>
      <p className="mt-1 text-[17px] text-muted-foreground">
        What does the creative team need to make for you?
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_300px]">
        {actions.map(({ href, icon: Icon, title, text, cta }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col rounded-3xl bg-card p-5 shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Icon className="size-5" aria-hidden />
            </div>
            <h2 className="mt-3 text-[19px] font-semibold">{title}</h2>
            <p className="mt-1 flex-1 text-[15px] leading-normal text-muted-foreground">{text}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary">
              {cta}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}

        {/* My requests: an overview, not an action, so it looks quieter. */}
        <section
          aria-labelledby="my-requests-title"
          className="flex flex-col rounded-3xl border border-border bg-background/60 p-5 md:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList className="size-5 text-muted-foreground" aria-hidden />
            <h2 id="my-requests-title" className="text-[15px] font-semibold">
              My requests
            </h2>
          </div>
          <ul className="mt-2 flex-1 divide-y divide-border">
            {counts.map((c) => (
              <li key={c.label}>
                <Link
                  href={`/requests?tab=${c.tab}`}
                  className="group flex items-center justify-between py-2.5 text-[15px] transition-colors hover:text-primary"
                >
                  <span className="text-muted-foreground group-hover:text-primary">{c.label}</span>
                  <span className="flex items-center gap-1 font-semibold tabular-nums">
                    {c.value}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/requests"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            See all requests
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </section>
      </div>

      <DescribeBox />
    </main>
  );
}
