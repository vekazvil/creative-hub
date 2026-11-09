import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <defs>
        <linearGradient id="ch-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f8cff" />
          <stop offset="1" stopColor="#0063d1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ch-logo)" />
      <path d="M11 16h10M16 11v10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">Creative Hub</span>
    </span>
  );
}
