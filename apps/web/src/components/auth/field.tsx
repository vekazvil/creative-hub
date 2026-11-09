'use client';

import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Extra element on the label row, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
};

/** Label, input and an animated error line, wired up for screen readers. */
export function Field({ label, error, hint, aside, className, type, ...props }: FieldProps) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[15px] font-medium">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy || undefined}
          className={cn(isPassword && 'pr-12')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute inset-y-0 right-1.5 my-auto flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal}
          >
            {reveal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && (
        <div id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Banner for errors that belong to the whole form, not one field. */
export function FormAlert({
  message,
  tone = 'error',
}: {
  message?: string;
  tone?: 'error' | 'info';
}) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={message}
          role={tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'rounded-xl px-4 py-3 text-[15px]',
            tone === 'error'
              ? 'bg-destructive/[0.07] text-destructive'
              : 'bg-accent text-accent-foreground',
          )}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
