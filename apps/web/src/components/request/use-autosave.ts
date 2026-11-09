'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const RETRY_MS = 3000;

/** Debounced save of the latest value, retried on failure. `flush` saves now (e.g. before navigating). */
export function useAutosave<T>(value: T, save: (v: T) => Promise<unknown>, delay = 700) {
  const [state, setState] = useState<SaveState>('idle');
  const latest = useRef(value);
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);
  const dirty = useRef(false);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async function attempt(): Promise<void> {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setState('saving');
    try {
      await saveRef.current(latest.current);
      setState('saved');
    } catch {
      dirty.current = true;
      setState('error');
      timer.current = setTimeout(() => void attempt(), RETRY_MS);
    }
  }, []);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [value, delay, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      clearTimeout(timer.current);
    };
  }, []);

  return { state, flush };
}
