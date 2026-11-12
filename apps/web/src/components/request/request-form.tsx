'use client';

import {
  buildSections,
  CAMPAIGN_PIECE_TYPES,
  CUSTOM_TYPE_ID,
  F,
  getWorkType,
  isFilled,
  missingRequired,
  noticeCheck,
  requiredCount,
  sectionValue,
  subitemsText,
  type Approver,
  type Brand,
  type FieldValue,
  type FormSection,
  type RequestFormData,
  type RequestMode,
  type WorkType,
} from '@creative-hub/core';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';

import { saveDraft } from '@/app/(app)/requests/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ApproversContext, BrandsContext, FieldControl } from './field-controls';
import { Stepper } from './stepper';
import { REQUEST_STEPS, type Step } from './steps';
import { useAutosave, type SaveState } from './use-autosave';

interface Props {
  requestId: string;
  type: WorkType;
  mode: RequestMode;
  initial: RequestFormData;
  requester: string;
  brands: Brand[];
  approvers: Approver[];
  /** Autosave. Defaults to the signed-in requester's draft. */
  save?: (data: RequestFormData) => Promise<unknown>;
  /** Stepper and links, for flows outside "My requests" (the public link). */
  steps?: Step[];
  stepIndex?: number;
  reviewHref?: string;
  changeTypeHref?: string;
  /** Replaces the requester field's hint, e.g. on a public link where there is no account. */
  requesterHint?: string;
}

const fieldAnchor = (sectionId: string, fieldId: string) => `f-${sectionId}-${fieldId}`;

export function RequestForm({
  requestId,
  type,
  mode,
  initial,
  requester,
  brands,
  approvers,
  save: saveProp,
  steps,
  stepIndex = 1,
  reviewHref = `/requests/${requestId}/review`,
  changeTypeHref = '/requests/new',
  requesterHint,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<RequestFormData>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [navigating, startNav] = useTransition();
  const save = useCallback(
    (d: RequestFormData) => (saveProp ? saveProp(d) : saveDraft(requestId, d)),
    [requestId, saveProp],
  );
  const { state, flush } = useAutosave(data, save);

  const sections = useMemo(() => buildSections(type, mode, data), [type, mode, data]);
  const missing = useMemo(() => missingRequired(sections, data), [sections, data]);
  const total = requiredCount(sections);
  const notice = noticeCheck([
    data.values[F.firstDraft] as string,
    data.values[F.finalFiles] as string,
  ]);

  const setValue = (section: FormSection, fieldId: string, value: FieldValue) =>
    setData((d) => {
      if (section.pieceIndex === undefined) {
        // An answer the requester changes is theirs: drop the "from the chat" / "AI suggestion" mark.
        const { [fieldId]: _dropped, ...meta } = d.meta ?? {};
        return { ...d, values: { ...d.values, [fieldId]: value }, meta };
      }
      const pieces = [...(d.pieces ?? [])];
      const piece = pieces[section.pieceIndex]!;
      pieces[section.pieceIndex] = { ...piece, values: { ...piece.values, [fieldId]: value } };
      return { ...d, pieces };
    });

  const addPiece = (pieceType: string) =>
    setData((d) => ({ ...d, pieces: [...(d.pieces ?? []), { type: pieceType, values: {} }] }));
  const removePiece = (i: number) =>
    setData((d) => ({ ...d, pieces: (d.pieces ?? []).filter((_, j) => j !== i) }));

  function goToField(sectionId: string, fieldId: string) {
    const el = document.getElementById(fieldAnchor(sectionId, fieldId));
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(
      () => el?.querySelector<HTMLElement>('input,textarea,button')?.focus({ preventScroll: true }),
      350,
    );
  }

  function continueToReview() {
    if (missing.length > 0) {
      setShowErrors(true);
      goToField(missing[0]!.sectionId, missing[0]!.fieldId);
      return;
    }
    startNav(async () => {
      await flush();
      router.push(reviewHref);
    });
  }

  const missingSet = new Set(missing.map((m) => `${m.sectionId}:${m.fieldId}`));

  return (
    <BrandsContext value={brands}>
      <ApproversContext value={approvers}>
        <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <Stepper steps={steps ?? REQUEST_STEPS(requestId)} current={stepIndex} />

          <header className="mt-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                {type.code} · {mode === 'update' ? 'UPDATE' : 'NEW'}
                {type.id === CUSTOM_TYPE_ID && ' · BUILT BY AI'}
              </div>
              <h1 className="mt-1 text-[30px] leading-tight font-semibold sm:text-[34px]">
                {type.name}
              </h1>
              {type.id === CUSTOM_TYPE_ID && type.examples && (
                <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">{type.examples}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <SaveIndicator state={state} />
              <Link
                href={changeTypeHref}
                className="text-[15px] font-medium text-primary hover:underline"
              >
                {type.id === CUSTOM_TYPE_ID ? 'Start over' : 'Change type'}
              </Link>
            </div>
          </header>

          {type.process && (
            <div className="mt-6 flex gap-3 rounded-2xl bg-[#fff4e5] p-4 text-[15px] text-[#8a4b00] dark:bg-[#3a2a12] dark:text-[#ffb35c]">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              {type.process}
            </div>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Questions marked <span className="text-destructive">*</span> are required.
              </p>
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  data={data}
                  requester={requester}
                  requesterHint={requesterHint}
                  showErrors={showErrors}
                  missingSet={missingSet}
                  onChange={setValue}
                  onRemove={
                    section.pieceIndex !== undefined && (data.pieces?.length ?? 0) > 1
                      ? () => removePiece(section.pieceIndex!)
                      : undefined
                  }
                />
              ))}
              {type.id === 'campaign' && <AddPiece onAdd={addPiece} />}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              {data.notes && (
                <PanelCard icon={StickyNote} title="Your notes">
                  <p className="max-h-48 overflow-auto text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {data.notes}
                  </p>
                </PanelCard>
              )}
              <PanelCard
                icon={missing.length === 0 ? CheckCircle2 : AlertCircle}
                iconClass={missing.length === 0 ? 'text-success' : 'text-muted-foreground'}
                title="Required questions"
              >
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      missing.length === 0 ? 'bg-success' : 'bg-primary',
                    )}
                    animate={{
                      width: `${total ? ((total - missing.length) / total) * 100 : 100}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {missing.length === 0
                    ? `All ${total} required questions are answered.`
                    : `${total - missing.length} of ${total} answered.`}
                </p>
                {missing.length > 0 && (
                  <ul className="mt-3 max-h-56 space-y-1 overflow-auto">
                    {missing.map((m) => (
                      <li key={`${m.sectionId}:${m.fieldId}`}>
                        <button
                          type="button"
                          onClick={() => goToField(m.sectionId, m.fieldId)}
                          className="w-full truncate rounded-lg px-2 py-1 text-left text-sm text-primary hover:bg-accent"
                        >
                          {m.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelCard>
              <PanelCard icon={Clock} title="Timing">
                {notice ? (
                  <p
                    className={cn(
                      'text-sm',
                      notice.urgent
                        ? 'text-[#b25000] dark:text-[#ffb35c]'
                        : 'text-muted-foreground',
                    )}
                  >
                    {notice.workingDays} working {notice.workingDays === 1 ? 'day' : 'days'} in
                    Texas until the first deadline.{' '}
                    {notice.urgent
                      ? 'That’s under the normal 5 days, so the PM or creative manager approves it first.'
                      : 'Normal notice, no rush approval needed.'}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Normal notice is 5 working days, counted in Texas. Under that, the PM or the
                    creative manager approves first.
                  </p>
                )}
              </PanelCard>
              <PanelCard icon={Lightbulb} title="When you send">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>A project number and a Monday item</li>
                  <li>
                    Subitems{' '}
                    {subitemsText(type).replace(
                      'Process to be decided for website work',
                      'to be decided',
                    )}
                  </li>
                  <li>A Drive folder with the brief and your files</li>
                  <li>A Slack channel for the creative team</li>
                  <li>An email to you with the links</li>
                </ul>
              </PanelCard>
            </aside>
          </div>

          <div className="sticky bottom-0 z-30 mx-[calc(50%-50vw)] mt-10 w-screen border-t border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="text-sm text-muted-foreground">
                {missing.length === 0 ? 'Ready to check.' : `${missing.length} required left`}
              </p>
              <Button onClick={continueToReview} loading={navigating}>
                Continue to check and send
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>
        </main>
      </ApproversContext>
    </BrandsContext>
  );
}

function SectionCard({
  section,
  data,
  requester,
  requesterHint,
  showErrors,
  missingSet,
  onChange,
  onRemove,
}: {
  section: FormSection;
  data: RequestFormData;
  requester: string;
  requesterHint?: string;
  showErrors: boolean;
  missingSet: Set<string>;
  onChange: (s: FormSection, fieldId: string, v: FieldValue) => void;
  onRemove?: () => void;
}) {
  const isPiece = section.pieceIndex !== undefined;
  const [open, setOpen] = useState(!isPiece || section.pieceIndex === 0);
  const answered = section.fields.filter((f) => isFilled(sectionValue(data, section, f.id))).length;

  return (
    <motion.section
      layout="position"
      id={`section-${section.id}`}
      className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-(--shadow-card) sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {section.eyebrow}
          </div>
          <h2 className="mt-1 text-[22px] font-semibold">{section.title}</h2>
          {section.intro && (
            <p className="mt-1 text-[15px] text-muted-foreground">{section.intro}</p>
          )}
        </div>
        {isPiece && (
          <div className="flex shrink-0 items-center gap-1">
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Remove ${section.title}`}
              >
                <Trash2 />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {open ? 'Collapse' : `Fill in · ${answered}/${section.fields.length}`}
              <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
            </Button>
          </div>
        )}
      </div>
      {section.tip && (
        <div className="mt-4 flex gap-2 rounded-2xl bg-accent px-4 py-3 text-[15px] text-accent-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          {section.tip}
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-x-5 gap-y-6 pt-6 sm:grid-cols-2">
              {section.fields.map((field) => {
                const id = fieldAnchor(section.id, field.id);
                const invalid = showErrors && missingSet.has(`${section.id}:${field.id}`);
                const meta = section.pieceIndex === undefined ? data.meta?.[field.id] : undefined;
                return (
                  <div
                    key={field.id}
                    id={id}
                    className={cn(
                      'scroll-mt-28 space-y-2',
                      field.half ? 'sm:col-span-1' : 'sm:col-span-2',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        id={`${id}-input-label`}
                        htmlFor={`${id}-input`}
                        className="block text-[15px] font-medium"
                      >
                        {field.label}
                        {field.required && <span className="ml-0.5 text-destructive">*</span>}
                      </label>
                      {meta && <SourceBadge source={meta.source} />}
                    </div>
                    <FieldControl
                      id={`${id}-input`}
                      field={field}
                      value={sectionValue(data, section, field.id)}
                      onChange={(v) => onChange(section, field.id, v)}
                      requester={requester}
                      invalid={invalid}
                    />
                    <AnimatePresence initial={false}>
                      {invalid && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden text-sm text-destructive"
                        >
                          This one is required.
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {meta?.note && !invalid && (
                      <p className="text-sm text-[#8a4b00] dark:text-[#ffb35c]">{meta.note}</p>
                    )}
                    {field.hint && field.kind !== 'file' && !invalid && (
                      <p className="text-sm text-muted-foreground">
                        {field.id === F.requester && requesterHint ? requesterHint : field.hint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function SourceBadge({ source }: { source: 'chat' | 'ai' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        source === 'chat'
          ? 'bg-accent text-accent-foreground'
          : 'bg-[#fff1df] text-[#8a4b00] dark:bg-[#3a2a12] dark:text-[#ffb35c]',
      )}
    >
      {source === 'chat' ? 'From the chat' : 'AI suggestion'}
    </span>
  );
}

function AddPiece({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-input p-6 sm:p-8">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Pieces
      </div>
      <h2 className="mt-1 text-[22px] font-semibold">Add a piece</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Each piece keeps its own type, specs and quantity.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {CAMPAIGN_PIECE_TYPES.map((id) => (
          <Button key={id} variant="outline" size="sm" onClick={() => onAdd(id)}>
            <Plus aria-hidden />
            {getWorkType(id)!.name}
          </Button>
        ))}
      </div>
    </section>
  );
}

function PanelCard({
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-(--shadow-card)">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn('size-4 text-muted-foreground', iconClass)} />
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = {
    idle: 'Draft',
    saving: 'Saving…',
    saved: 'Draft saved',
    error: 'Couldn’t save, retrying',
  }[state];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={state}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.15 }}
        className={cn('text-sm', state === 'error' ? 'text-destructive' : 'text-muted-foreground')}
        role="status"
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}
