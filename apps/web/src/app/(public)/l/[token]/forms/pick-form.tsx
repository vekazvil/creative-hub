'use client';

import { orderedWorkTypes, type RequestMode, type WorkType } from '@creative-hub/core';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Stepper } from '@/components/request/stepper';
import { PUBLIC_STEPS } from '@/components/request/steps';
import { CampaignCard, TypeGrid } from '@/components/request/type-grid';
import { cn } from '@/lib/utils';

import { createPublicDraft } from '../actions';

const TYPES = orderedWorkTypes();
const TOP = TYPES.filter((t) => t.group === 'top');
const MORE = TYPES.filter((t) => t.group === 'more');
const CAMPAIGN = TYPES.find((t) => t.group === 'special')!;

export function PickForm({ token }: { token: string }) {
  const base = `/l/${token}`;
  const [mode, setMode] = useState<RequestMode>('new');
  const [pendingType, setPendingType] = useState<string>();
  const [, startTransition] = useTransition();

  function start(type: WorkType) {
    setPendingType(type.id);
    startTransition(async () => {
      await createPublicDraft(token, { typeId: type.id, mode });
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <Stepper steps={PUBLIC_STEPS(base, { path: 'forms' })} current={1} />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">
            Pick the closest form
          </h1>
          <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
            The form then asks only what this kind of work needs.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="New work or update"
          className="inline-flex shrink-0 self-start rounded-full bg-black/[0.05] p-1 sm:self-auto dark:bg-white/10"
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
                  layoutId="public-mode-pill"
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{m === 'new' ? 'New work' : 'Update'}</span>
            </button>
          ))}
        </div>
      </motion.section>

      <TypeGrid title="Most requested" types={TOP} pending={pendingType} onPick={start} />
      <CampaignCard type={CAMPAIGN} pending={pendingType} onPick={start} />
      <TypeGrid title="More types" types={MORE} pending={pendingType} onPick={start} />

      <Link
        href={`${base}/ai`}
        className="group mt-12 flex items-center gap-4 rounded-3xl border border-dashed border-input p-6 transition-colors hover:bg-card focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
      >
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="block text-[17px] font-semibold">Nothing fits?</span>
          <span className="mt-0.5 block text-[15px] text-muted-foreground">
            Describe it and let AI build a form for it.
          </span>
        </span>
      </Link>
    </main>
  );
}
