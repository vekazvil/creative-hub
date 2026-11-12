'use client';

import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { Stepper } from '@/components/request/stepper';
import { PUBLIC_STEPS } from '@/components/request/steps';

const CHOICES = [
  {
    path: 'forms',
    icon: LayoutGrid,
    iconClass: 'bg-secondary text-foreground',
    eyebrow: 'Most requests',
    title: 'Use one of our forms',
    body: 'Sell sheets, ads, packaging, events, video, social and more. Pick the closest one and answer only what that work needs.',
    cta: 'See the forms',
  },
  {
    path: 'ai',
    icon: Sparkles,
    iconClass: 'bg-gradient-to-br from-[#2f8cff] to-[#0063d1] text-white',
    eyebrow: 'Nothing fits?',
    title: 'Let AI build the form',
    body: 'Describe what you need in your own words. AI writes a form with the right questions for it, and you fill it in.',
    cta: 'Describe it',
  },
] as const;

export function StartChoice({ base }: { base: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <Stepper steps={PUBLIC_STEPS(base)} current={0} />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">
          How do you want to start?
        </h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
          Every request reaches the creative team as a clear brief. Choose the way that fits what
          you need.
        </p>
      </motion.section>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {CHOICES.map((c, i) => (
          <motion.li
            key={c.path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
          >
            <Link
              href={`${base}/${c.path}`}
              className="group flex h-full flex-col rounded-3xl bg-card p-7 shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none sm:p-8"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-2xl ${c.iconClass}`}
              >
                <c.icon className="size-6" aria-hidden />
              </span>
              <span className="mt-6 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {c.eyebrow}
              </span>
              <span className="mt-1 text-[22px] leading-snug font-semibold">{c.title}</span>
              <span className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">
                {c.body}
              </span>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary">
                {c.cta}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </main>
  );
}
