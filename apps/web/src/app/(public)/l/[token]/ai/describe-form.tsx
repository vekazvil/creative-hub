'use client';

import { Check, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Stepper } from '@/components/request/stepper';
import { PUBLIC_STEPS } from '@/components/request/steps';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { buildFormWithAi } from '../actions';

const MIN_LENGTH = 20;

const EXAMPLES = [
  'A recipe booklet for the H-E-B cooking demo: 12 pages, bilingual, with our chipotle and salsa verde recipes. We print 2,000 copies.',
  'Custom name badges and lanyards for 40 people at our sales kickoff in Houston, with the La Costeña logo.',
  'A wrap for our new delivery van, both sides and the back, showing the Doña María line.',
];

const BUILDING = ['Reading your description', 'Choosing the questions', 'Setting up your form'];

export function DescribeForm({ token }: { token: string }) {
  const base = `/l/${token}`;
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [building, start] = useTransition();
  const ready = text.trim().length >= MIN_LENGTH;

  function build() {
    setError(undefined);
    start(async () => {
      const res = await buildFormWithAi(token, text);
      // On success the action redirects to the new form; only an error comes back.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <Stepper steps={PUBLIC_STEPS(base, { path: 'ai' })} current={1} />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">
          Tell us what you need
        </h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
          What gets made, for whom, where it will be used and anything you already know. AI turns it
          into a form with the right questions, and your description stays next to it.
        </p>
      </motion.section>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-8 rounded-3xl bg-card p-2 shadow-(--shadow-card)"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !building) build();
        }}
      >
        <label htmlFor="describe" className="sr-only">
          Describe what you need
        </label>
        <textarea
          id="describe"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready && !building) build();
          }}
          rows={6}
          disabled={building}
          autoFocus
          placeholder="e.g. “We need a recipe booklet for an in-store cooking demo, 12 pages, bilingual, printed in 2,000 copies.”"
          className="block w-full resize-none rounded-2xl bg-transparent px-4 pt-3 pb-2 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="hidden pl-2 text-sm text-muted-foreground sm:block">
            {ready ? 'Ready when you are.' : 'A sentence or two is enough.'}
          </p>
          <Button type="submit" size="sm" className="ml-auto" disabled={!ready} loading={building}>
            {!building && <Sparkles aria-hidden />}
            Build my form
          </Button>
        </div>
      </motion.form>

      <AnimatePresence mode="wait">
        {building ? (
          <BuildingSteps key="building" />
        ) : error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-4 rounded-2xl bg-destructive/10 px-5 py-4 text-[15px] text-destructive"
          >
            {error}
          </motion.p>
        ) : (
          <motion.section
            key="examples"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            <h2 className="mb-4 text-[15px] font-semibold text-muted-foreground">
              Not sure how to put it? Start from an example
            </h2>
            <ul className="grid gap-3 md:grid-cols-3">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => setText(ex)}
                    className="h-full w-full rounded-2xl bg-card p-5 text-left text-[15px] leading-relaxed text-muted-foreground shadow-(--shadow-card) transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:text-foreground hover:shadow-(--shadow-float) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[15px] text-muted-foreground">
              Maybe one of our forms already fits?{' '}
              <Link href={`${base}/forms`} className="font-medium text-primary hover:underline">
                See the forms
              </Link>
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

/** What AI is doing while the form is built; advances on a timer, the last step waits. */
function BuildingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BUILDING.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.ol
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      aria-live="polite"
      className="mt-4 space-y-3 rounded-3xl border border-primary/20 bg-accent/60 p-5"
    >
      {BUILDING.map((label, i) => (
        <li
          key={label}
          className={cn(
            'flex items-center gap-3 text-[15px] transition-colors duration-300',
            i > step && 'text-muted-foreground/60',
          )}
        >
          <span className="flex size-6 items-center justify-center">
            {i < step ? (
              <Check className="size-4 text-primary" strokeWidth={2.75} />
            ) : i === step ? (
              <span className="size-2.5 animate-pulse rounded-full bg-primary" />
            ) : (
              <span className="size-2 rounded-full bg-muted-foreground/30" />
            )}
          </span>
          {label}
        </li>
      ))}
    </motion.ol>
  );
}
