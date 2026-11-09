import Link from 'next/link';

import { LogoMark } from '@/components/brand/logo';

const LINKS = [
  { href: '/requests/new', label: 'New request' },
  { href: '/chat', label: 'Chat' },
  { href: '/requests', label: 'My requests' },
];

export function AppFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-black/[0.06] bg-background dark:border-white/10">
      <div className="mx-auto flex h-[var(--footer-h)] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 text-[13px]">
          <LogoMark className="size-5" />
          <span className="font-semibold tracking-tight">Creative Hub</span>
          <span className="hidden text-muted-foreground lg:inline">
            · Requests for the Vilore Foods creative team
          </span>
        </div>

        <div className="flex items-center gap-x-5 text-[13px] text-muted-foreground">
          <nav aria-label="Footer" className="hidden gap-5 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="hidden h-3.5 w-px bg-border md:block" aria-hidden />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            Pilot
          </span>
          <span className="whitespace-nowrap">© {new Date().getFullYear()} Vilore Foods</span>
        </div>
      </div>
    </footer>
  );
}
