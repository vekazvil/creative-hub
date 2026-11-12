'use client';

import {
  getWorkType,
  orderedWorkTypes,
  type RequestMode,
  type TypeSuggestionResult,
  type WorkType,
} from '@creative-hub/core';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useTransition } from 'react';

import { Stepper } from '@/components/request/stepper';
import { REQUEST_STEPS } from '@/components/request/steps';
import { CampaignCard, TypeGrid } from '@/components/request/type-grid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { createDraft, suggestRequestType } from '../actions';

const TYPES = orderedWorkTypes();
const TOP = TYPES.filter((t) => t.group === 'top');
const MORE = TYPES.filter((t) => t.group === 'more');
const CAMPAIGN = TYPES.find((t) => t.group === 'special')!;

export function NewRequest() {
  const [mode, setMode] = useState<RequestMode>('new');
  const [notes, setNotes] = useState('');
  const [suggestion, setSuggestion] = useState<TypeSuggestionResult>();
  const [suggestError, setSuggestError] = useState<string>();
  const [demo, setDemo] = useState(false);
  const [answer, setAnswer] = useState('');
  // The question already answered: the model gets one question, then it has to decide.
  const [answered, setAnswered] = useState(false);
  const [suggesting, startSuggest] = useTransition();
  const [pendingType, setPendingType] = useState<string>();
  const [, startTransition] = useTransition();
  const [notCreativeOpen, setNotCreativeOpen] = useState(false);

  function start(type: WorkType) {
    setPendingType(type.id);
    startTransition(async () => {
      await createDraft({ typeId: type.id, mode, notes: notes.trim() || undefined });
    });
  }

  function resetSuggestion() {
    setSuggestion(undefined);
    setSuggestError(undefined);
    setAnswer('');
    setAnswered(false);
  }

  function suggest(followUp?: { question: string; answer: string }) {
    setSuggestError(undefined);
    startSuggest(async () => {
      const res = await suggestRequestType({ notes: notes.trim(), followUp });
      if (!res.ok) {
        setSuggestError(res.error);
        return;
      }
      setSuggestion(res.suggestion);
      setDemo(res.demo);
      if (res.suggestion.mode) setMode(res.suggestion.mode);
      if (followUp) setAnswered(true);
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
            resetSuggestion();
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
            loading={suggesting}
            onClick={() => suggest()}
          >
            <Sparkles aria-hidden />
            Suggest a type
          </Button>
        </div>
      </motion.section>

      <AnimatePresence>
        {(suggestion || suggestError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-3xl border border-primary/20 bg-accent/60 p-5">
              {suggestError ? (
                <p className="text-[15px]">{suggestError}</p>
              ) : suggestion?.workType ? (
                <SuggestedType
                  suggestion={suggestion}
                  demo={demo}
                  pending={pendingType}
                  onPick={start}
                />
              ) : suggestion?.question && !answered ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const a = answer.trim();
                    if (a && suggestion.question)
                      suggest({ question: suggestion.question, answer: a });
                  }}
                >
                  <div className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
                    One quick question
                  </div>
                  <p className="text-[17px] font-medium">{suggestion.question}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      autoFocus
                      aria-label="Your answer"
                      placeholder="Your answer"
                      className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-[15px] outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                    />
                    <Button type="submit" disabled={!answer.trim()} loading={suggesting}>
                      Answer
                      <ArrowRight aria-hidden />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Or pick a type below. Your notes come with you.
                  </p>
                </form>
              ) : (
                <p className="text-[15px]">
                  We couldn’t tell the type from your notes. Pick the closest one below. Your notes
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

      <CampaignCard type={CAMPAIGN} pending={pendingType} onPick={start} />

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
              Send it to <span className="font-medium">[team or person, to be confirmed]</span>. It
              won’t get a project number, a creative folder or creative subitems.
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function SuggestedType({
  suggestion,
  demo,
  pending,
  onPick,
}: {
  suggestion: TypeSuggestionResult;
  demo: boolean;
  pending?: string;
  onPick: (t: WorkType) => void;
}) {
  const type = getWorkType(suggestion.workType!)!;
  const alternatives = suggestion.alternatives
    .map((id) => getWorkType(id))
    .filter((t): t is WorkType => !!t);
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
            {suggestion.confidence === 'sure' ? 'Suggested' : 'Best match'} · {type.code}
          </div>
          <div className="mt-1 text-[17px] font-semibold">{type.name}</div>
          <div className="mt-0.5 text-[15px] text-muted-foreground">
            {suggestion.reason}
            {demo && ' (Demo: matched by keywords, AI isn’t connected.)'}
          </div>
        </div>
        <Button onClick={() => onPick(type)} loading={pending === type.id}>
          Use this type
          <ArrowRight aria-hidden />
        </Button>
      </div>
      {alternatives.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-4 text-[15px]">
          <span className="mr-1 text-muted-foreground">Or maybe:</span>
          {alternatives.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              size="sm"
              onClick={() => onPick(t)}
              loading={pending === t.id}
            >
              {t.name}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
