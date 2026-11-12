import {
  buildBrief,
  buildSections,
  findBrand,
  formatDate,
  missingRequired,
  noticeCheck,
  subitemsText,
  type Approver,
  type Brand,
  type RequestFormData,
  type RequestMode,
  type WorkType,
} from '@creative-hub/core';
import { CalendarClock, CheckCircle2, CircleAlert, Workflow } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Stepper } from './stepper';
import type { Step } from './steps';

/** "Check and send": the brief as the creative team gets it, with the send bar below. */
export function ReviewView({
  request,
  type,
  mode,
  data,
  requester,
  brands,
  approvers,
  steps,
  stepIndex,
  editHref,
  sendBar,
}: {
  request: {
    title: string | null;
    brandCode: string | null;
    firstDraftOn: string | null;
    finalFilesOn: string | null;
  };
  type: WorkType;
  mode: RequestMode;
  data: RequestFormData;
  requester: string;
  brands: Brand[];
  approvers: Approver[];
  steps: Step[];
  stepIndex: number;
  /** The details page; a section anchor is added to it. */
  editHref: string;
  sendBar: (missing: string[], urgent: boolean) => ReactNode;
}) {
  const brief = buildBrief(type, mode, data, requester, brands, approvers);
  const missing = missingRequired(buildSections(type, mode, data), data);
  const notice = noticeCheck([
    request.firstDraftOn ?? undefined,
    request.finalFilesOn ?? undefined,
  ]);
  const brand = request.brandCode ? findBrand(brands, request.brandCode) : undefined;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Stepper steps={steps} current={stepIndex} />

      <header className="mt-10">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
          {type.code} · {mode === 'update' ? 'UPDATE' : 'NEW'}
        </div>
        <h1 className="mt-1 text-[30px] leading-tight font-semibold sm:text-[34px]">
          Check and send
        </h1>
        <p className="mt-2 text-[17px] text-muted-foreground">
          This is the brief the creative team gets, section by section.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {brief.map((section) => (
            <section
              key={section.code}
              className="rounded-3xl bg-card p-6 shadow-(--shadow-card) sm:p-8"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-3 text-[20px] font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-sm text-muted-foreground">
                    {section.code}
                  </span>
                  {section.title}
                </h2>
                <Link
                  href={`${editHref}#section-${section.rows.find((r) => r.sectionId)?.sectionId ?? 'basics'}`}
                  className="text-[15px] font-medium text-primary hover:underline"
                >
                  Edit
                </Link>
              </div>
              <dl className="mt-5 divide-y divide-border">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-6"
                  >
                    <dt className="text-[15px] text-muted-foreground">{row.label}</dt>
                    <dd
                      className={`text-[15px] whitespace-pre-wrap ${row.value ? '' : 'text-destructive'}`}
                    >
                      {row.value || 'Missing'}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl bg-card p-6 shadow-(--shadow-card)">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {type.name}
            </div>
            <div className="mt-1 text-[19px] leading-snug font-semibold">
              {request.title ?? 'Untitled request'}
            </div>
            {brand && <div className="mt-1 text-[15px] text-muted-foreground">{brand.name}</div>}
            <div
              className={`mt-5 flex items-center gap-2 text-[15px] ${missing.length ? 'text-destructive' : 'text-success'}`}
            >
              {missing.length ? (
                <CircleAlert className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {missing.length
                ? `${missing.length} required ${missing.length === 1 ? 'question' : 'questions'} left`
                : 'All required questions answered'}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-(--shadow-card)">
            <div className="mb-2 flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold">Timing</h3>
            </div>
            <p
              className={`text-sm ${notice?.urgent ? 'text-[#b25000] dark:text-[#ffb35c]' : 'text-muted-foreground'}`}
            >
              {notice
                ? `${notice.workingDays} working ${notice.workingDays === 1 ? 'day' : 'days'} in Texas until ${formatDate(notice.deadline)}. ${
                    notice.urgent
                      ? 'Under 5 days: the PM or creative manager approves before the creative team starts.'
                      : 'Normal notice.'
                  }`
                : 'Add the first draft and final files dates.'}
            </p>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-(--shadow-card)">
            <div className="mb-2 flex items-center gap-2">
              <Workflow className="size-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold">When you send</h3>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>A project number and a Monday item</li>
              <li>Subitems: {subitemsText(type)}</li>
              <li>A Drive folder with the brief and your files</li>
              <li>A Slack channel for the creative team</li>
              <li>An email to you with the links</li>
            </ul>
          </div>
        </aside>
      </div>

      {sendBar(
        missing.map((m) => m.label),
        notice?.urgent ?? false,
      )}
    </main>
  );
}
