'use client';

import { Check, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';

import type { Step } from './steps';

/**
 * Progress across the request steps, as one card with a segment per step.
 * The current step sits on a tinted pill; done steps show a check and link back.
 */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-1 rounded-2xl bg-card p-1.5 shadow-(--shadow-card)">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const body = (
            <span className="relative flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-300',
                  done && 'bg-primary/10 text-primary',
                  active && 'bg-primary text-primary-foreground shadow-sm',
                  !done && !active && 'border border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={2.75} /> : i + 1}
              </span>
              <span className={cn('min-w-0', !active && 'hidden sm:block')}>
                <span
                  className={cn(
                    'block truncate text-[15px] leading-tight',
                    active ? 'font-semibold text-foreground' : 'text-foreground/80',
                    !done && !active && 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                <span className="mt-0.5 block text-xs whitespace-nowrap text-muted-foreground">
                  {done ? 'Done' : active ? `Step ${i + 1} of ${steps.length}` : 'Next'}
                </span>
              </span>
            </span>
          );

          return (
            <Fragment key={s.label}>
              {i > 0 && (
                <li aria-hidden className="shrink-0">
                  <ChevronRight className="size-4 text-muted-foreground/50" />
                </li>
              )}
              <li
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'relative min-w-0',
                  active ? 'flex-1 sm:flex-[1.4]' : 'flex-none sm:flex-1',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="stepper-active"
                    className="absolute inset-0 rounded-xl bg-accent"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                {done && s.href ? (
                  <Link
                    href={s.href}
                    className="block rounded-xl transition-colors hover:bg-muted/70 focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
