'use client';

import { ClipboardList, LogOut, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

const item = 'gap-2.5 rounded-xl px-3 py-2 text-[15px] cursor-pointer';

export function UserMenu({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#e8f1fc] to-[#d6e6fb] text-[13px] font-semibold text-accent-foreground ring-offset-2 ring-offset-background transition-shadow outline-none hover:ring-2 hover:ring-border focus-visible:ring-4 focus-visible:ring-ring/25 data-[state=open]:ring-2 data-[state=open]:ring-primary/30 dark:from-[#0a2a4d] dark:to-[#0d355f]"
        aria-label={`Account menu for ${user.name}`}
      >
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-2xl border-0 p-1.5 shadow-(--shadow-float) ring-1 ring-black/5 dark:ring-white/10"
      >
        <div className="px-3 pt-2.5 pb-3">
          <div className="truncate text-[15px] font-semibold">{user.name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>
        {/* On small screens the main links live here too. */}
        <DropdownMenuGroup className="md:hidden">
          <DropdownMenuSeparator className="mx-1" />
          <DropdownMenuItem asChild className={item}>
            <Link href="/requests/new">
              <Plus /> New request
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <Link href="/chat">
              <MessageCircle /> Chat
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <Link href="/requests">
              <ClipboardList /> My requests
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-1" />
        <DropdownMenuItem
          className={item}
          disabled={signingOut}
          onSelect={(e) => {
            e.preventDefault();
            void signOut();
          }}
        >
          <LogOut /> {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
