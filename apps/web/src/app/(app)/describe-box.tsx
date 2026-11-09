'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { routeDescription } from './requests/actions';

/** "Not sure where to start?" — describe it and we take you to the right place. */
export function DescribeBox() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit() {
    if (!text.trim() || pending) return;
    setError(undefined);
    start(async () => {
      const res = await routeDescription(text);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <section className="mt-8 rounded-3xl bg-card p-5 shadow-(--shadow-card)">
      <h2 className="text-[19px] font-semibold">Not sure where to start?</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Tell us in your own words. We’ll open the right form, find your request, or help you in a
        chat.
      </p>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
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
            // Enter sends, Shift+Enter adds a new line (IME composition is left alone).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="e.g. “We’re at Pizza Expo in March and need something for the booth” or “What happened to my sell sheet from last week?”"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'describe-error' : undefined}
          className="block w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-[16px] leading-relaxed transition-[border-color,box-shadow] duration-200 ease-(--ease-apple) outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {error ? (
            <p id="describe-error" className="text-sm text-destructive">
              {error}{' '}
              <Link href="/requests/new" className="font-medium underline">
                Or pick the type yourself
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not sure at all? Just say so, and we’ll help you figure it out.
            </p>
          )}
          <Button type="submit" loading={pending} disabled={!text.trim()}>
            Take me there
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </form>
    </section>
  );
}
