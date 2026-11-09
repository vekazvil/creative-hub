import { Check } from 'lucide-react';

import { PASSWORD_MIN_LENGTH } from '@/lib/validation';
import { cn } from '@/lib/utils';

/** Live hint under a new-password field. */
export function PasswordChecklist({ password }: { password: string }) {
  const ok = password.length >= PASSWORD_MIN_LENGTH;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 transition-colors', ok && 'text-success')}
    >
      <Check
        className={cn('size-4 transition-opacity', ok ? 'opacity-100' : 'opacity-30')}
        aria-hidden
      />
      At least {PASSWORD_MIN_LENGTH} characters
    </span>
  );
}
