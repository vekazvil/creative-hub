'use client';

import {
  orderedWorkTypes,
  suggestWorkType,
  type RequestMode,
  type TypeSuggestion,
  type WorkType,
} from '@creative-hub/core';
import { ArrowRight, ChevronDown, Layers, Loader2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useTransition } from 'react';

import { Stepper } from '@/components/request/stepper';
import { REQUEST_STEPS } from '@/components/request/steps';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { createDraft } from '../actions';

const TYPES = orderedWorkTypes();
const TOP = TYPES.filter((t) => t.group === 'top');
const MORE = TYPES.filter((t) => t.group === 'more');
const CAMPAIGN = TYPES.find((t) => t.group === 'special')!;

export function NewRequest() {
  const [mode, setMode] = useState<RequestMode>('new');
  const [notes, setNotes] = useState('');
  const [suggestion, setSuggestion] = useState<TypeSuggestion | null | undefined>();
  const [pendingType, setPendingType] = useState<string>();
  const [, startTransition] = useTransition();
  const [notCreativeOpen, setNotCreativeOpen] = useState(false);

  function start(type: WorkType) {
    setPendingType(type.id);
    startTransition(async () => {
      await createDraft({ typeId: type.id, mode, notes: notes.trim() || undefined });
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <Stepper steps={REQUEST_STEPS()} current={0} />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">
          What do you need?
        </h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
          Describe it in your own words, or pick the closest match below. The form then asks only
          what this kind of work needs.
        </p>
      </motion.section>

      {/* Describe or paste */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-8 rounded-3xl bg-card p-2 shadow-(--shadow-card)"
      >
        <label htmlFor="notes" className="sr-only">
          Describe what you need or paste your notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSuggestion(undefined);
          }}
          rows={3}
          placeholder="Describe what you need or paste your notes, e.g. “We need a retractable banner for Pizza Expo in Las Vegas, showing three foodservice products.”"
          className="block w-full resize-none rounded-2xl bg-transparent px-4 pt-3 pb-2 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="hidden pl-2 text-sm text-muted-foreground sm:block">
            We keep your notes next to the form while you fill it in.
          </p>
          <Button
            size="sm"
            className="ml-auto"
            disabled={notes.trim().length < 8}
            onClick={() => setSuggestion(suggestWorkType(notes))}
          >
            <Sparkles aria-hidden />
            Suggest a type
          </Button>
        </div>
      </motion.section>

      <AnimatePresence>
        {suggestion !== undefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-primary/20 bg-accent/60 p-5 sm:flex-row sm:items-center">
              {suggestion ? (
                <>
                  <div className="flex-1">
                    <div className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
                      Suggested · {suggestion.type.code}
                    </div>
                    <div className="mt-1 text-[17px] font-semibold">{suggestion.type.name}</div>
                    <div className="mt-0.5 text-[15px] text-muted-foreground">
                      Your notes mention {suggestion.matched.map((m) => `“${m}”`).join(', ')}.
                    </div>
                  </div>
                  <Button
                    onClick={() => start(suggestion.type)}
                    loading={pendingType === suggestion.type.id}
                  >
                    Use this type
                    <ArrowRight aria-hidden />
                  </Button>
                </>
              ) : (
                <p className="text-[15px]">
                  We couldn’t tell the type from your notes. Pick the closest one below — your notes
                  come with you.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New or update */}
      <section className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[22px] font-semibold">Is it new work?</h2>
        <div
          role="radiogroup"
          aria-label="New work or update"
          className="inline-flex rounded-full bg-black/[0.05] p-1 dark:bg-white/10"
        >
          {(['new', 'update'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors',
                mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode === m && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                {m === 'new' ? 'New work' : 'Update something that exists'}
              </span>
            </button>
          ))}
        </div>
      </section>
      <AnimatePresence initial={false}>
        {mode === 'update' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 text-[15px] text-muted-foreground sm:text-right"
          >
            An update asks for the current file and what changes.
          </motion.p>
        )}
      </AnimatePresence>

      <TypeGrid title="Most requested" types={TOP} pending={pendingType} onPick={start} />

      {/* Campaign */}
      <button
        type="button"
        onClick={() => start(CAMPAIGN)}
        disabled={!!pendingType}
        className="group mt-4 flex w-full items-center gap-5 rounded-3xl bg-card p-6 text-left shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none disabled:opacity-60"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f8cff] to-[#0063d1] text-white">
          <Layers className="size-6" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Several pieces, one idea
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold">{CAMPAIGN.name}</span>
          <span className="mt-1 block text-[15px] text-muted-foreground">
            The strategy is asked once. Then each piece gets its own short form: social, email, OOH,
            video, e-commerce and more.
          </span>
        </span>
        {pendingType === CAMPAIGN.id ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </button>

      <TypeGrid title="More types" types={MORE} pending={pendingType} onPick={start} />

      {/* Not creative */}
      <section className="mt-12 rounded-3xl border border-border p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 text-left"
          aria-expanded={notCreativeOpen}
          onClick={() => setNotCreativeOpen((o) => !o)}
        >
          <span>
            <span className="block text-[17px] font-semibold">Not creative work?</span>
            <span className="mt-0.5 block text-[15px] text-muted-foreground">
              Reports, workflow or automation projects, spreadsheets and trainings don’t go to the
              creative team.
            </span>
          </span>
          <ChevronDown
            className={cn('size-5 shrink-0 transition-transform', notCreativeOpen && 'rotate-180')}
          />
        </button>
        <AnimatePresence initial={false}>
          {notCreativeOpen && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-3 text-[15px]"
            >
              Send it to <span className="font-medium">[team or person — to be confirmed]</span>. It
              won’t get a project number, a creative folder or creative subitems.
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function TypeGrid({
  title,
  types,
  pending,
  onPick,
}: {
  title: string;
  types: WorkType[];
  pending?: string;
  onPick: (t: WorkType) => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-[15px] font-semibold text-muted-foreground">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((t, i) => (
          <motion.li
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.2) }}
          >
            <button
              type="button"
              onClick={() => onPick(t)}
              disabled={!!pending}
              className="group flex h-full w-full flex-col rounded-2xl bg-card p-5 text-left shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {t.code}
                </span>
                {pending === t.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : t.process ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    Different process
                  </span>
                ) : null}
              </span>
              <span className="mt-2 text-[17px] leading-snug font-semibold">{t.name}</span>
              <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t.examples}
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
