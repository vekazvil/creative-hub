import type { ReactNode } from 'react';

import { Logo, LogoMark } from '@/components/brand/logo';

/** Pages anyone with the link can open: no sign-in, no app navigation. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-background/90 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-auto shrink-0 border-t border-black/[0.06] bg-background dark:border-white/10">
        <div className="mx-auto flex h-[var(--footer-h)] max-w-6xl items-center gap-2 px-4 text-[13px] sm:px-6">
          <LogoMark className="size-5" />
          <span className="font-semibold tracking-tight">Creative Hub</span>
          <span className="text-muted-foreground">
            · Requests for the Vilore Foods creative team
          </span>
        </div>
      </footer>
    </div>
  );
}
