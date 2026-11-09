'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const path = usePathname();
  const active =
    href === '/requests'
      ? path === '/requests' || /^\/requests\/(?!new)/.test(path)
      : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3 text-sm leading-none transition-colors',
        active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
