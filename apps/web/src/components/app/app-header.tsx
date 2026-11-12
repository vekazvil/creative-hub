import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/brand/logo';

import { NavLink } from './nav-link';
import { UserMenu } from './user-menu';

export function AppHeader({ user }: { user: { name: string; email: string } }) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-background/90 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center rounded-lg focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden h-full items-center gap-1 md:flex">
          <NavLink href="/chat">Chat</NavLink>
          <NavLink href="/requests">My requests</NavLink>
          <NavLink href="/links">Public links</NavLink>
          <NavLink href="/approvers">Approvers</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/links?new=1"
            className="group hidden h-9 items-center gap-2 rounded-full bg-primary py-1 pr-4 pl-1 text-[13.5px] font-medium text-primary-foreground shadow-[0_1px_2px_rgb(0_113_227/0.25)] transition-all duration-200 ease-(--ease-apple) hover:bg-primary/90 hover:shadow-[0_4px_14px_-4px_rgb(0_113_227/0.5)] focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none active:scale-[0.97] md:inline-flex"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 ease-(--ease-apple) group-hover:rotate-90">
              <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            </span>
            New public link
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
