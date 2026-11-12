'use client';

import type { WorkType } from '@creative-hub/core';
import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

/** The campaign card: several pieces around one idea. */
export function CampaignCard({
  type,
  pending,
  onPick,
}: {
  type: WorkType;
  pending?: string;
  onPick: (t: WorkType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(type)}
      disabled={!!pending}
      className="group mt-4 flex w-full items-center gap-5 rounded-3xl bg-card p-6 text-left shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none disabled:opacity-60"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f8cff] to-[#0063d1] text-white">
        <Layers className="size-6" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Several pieces, one idea
        </span>
        <span className="mt-0.5 block text-[17px] font-semibold">{type.name}</span>
        <span className="mt-1 block text-[15px] text-muted-foreground">
          The strategy is asked once. Then each piece gets its own short form: social, email, OOH,
          video, e-commerce and more.
        </span>
      </span>
      {pending === type.id ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

export function TypeGrid({
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
