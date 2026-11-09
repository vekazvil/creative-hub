'use client';

import { getWorkType } from '@creative-hub/core';
import { History, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatListItem } from '@/lib/chats';
import { cn } from '@/lib/utils';

type Props = {
  chats: ChatListItem[];
  activeId?: string;
  onDelete: (id: string) => void;
};

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** "2:31 PM" today, "Nov 3" before. */
function when(iso: string) {
  const at = new Date(iso);
  return at.toDateString() === new Date().toDateString() ? time.format(at) : day.format(at);
}

const month = new Intl.DateTimeFormat('en-US', { month: 'long' });
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** Today, Yesterday, Previous 7 days, Previous 30 days, then by month — like a mail app. */
function groupChats(chats: ChatListItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);
  const groups = new Map<string, ChatListItem[]>();
  for (const c of chats) {
    const at = new Date(c.lastMessageAt);
    const label =
      at >= today
        ? 'Today'
        : at >= daysAgo(1)
          ? 'Yesterday'
          : at >= daysAgo(7)
            ? 'Previous 7 days'
            : at >= daysAgo(30)
              ? 'Previous 30 days'
              : (at.getFullYear() === today.getFullYear() ? month : monthYear).format(at);
    groups.set(label, [...(groups.get(label) ?? []), c]);
  }
  // Chats come newest first, so groups are already in order.
  return [...groups].map(([label, items]) => ({ label, items }));
}

function ChatList({ chats, activeId, onDelete, onPick }: Props & { onPick?: () => void }) {
  const [confirming, setConfirming] = useState<string>();
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const q = query.trim().toLowerCase();
  const visible = q
    ? chats.filter((c) => {
        const type = c.workType ? getWorkType(c.workType)?.name : '';
        return `${c.title} ${type}`.toLowerCase().includes(q);
      })
    : chats;

  // Fade the list at an edge only when there is more to scroll that way.
  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdges({
      top: el.scrollTop > 4,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    });
  }, []);
  useEffect(() => {
    measure();
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, visible.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-[15px] font-semibold">
          Chats
          <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">
            {chats.length}
          </span>
        </h2>
        <Link
          href="/chat"
          onClick={onPick}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
          New
        </Link>
      </div>

      {chats.length > 4 && (
        <label className="relative mt-3 block">
          <span className="sr-only">Search chats</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-9 w-full rounded-xl bg-black/[0.04] pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground/70 focus:bg-card focus:shadow-[0_0_0_1px_rgb(0_113_227/0.35),0_0_0_4px_rgb(0_113_227/0.08)] dark:bg-white/[0.06]"
          />
        </label>
      )}

      <div className="mt-3 h-px bg-black/[0.06] dark:bg-white/10" />

      <nav
        ref={listRef}
        onScroll={measure}
        aria-label="Your chats"
        className={cn(
          '-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2',
          // Soft edges that say "there is more" above or below.
          edges.top && edges.bottom
            ? '[mask-image:linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-40px),transparent)]'
            : edges.bottom
              ? '[mask-image:linear-gradient(to_bottom,black_calc(100%-40px),transparent)]'
              : edges.top
                ? '[mask-image:linear-gradient(to_bottom,transparent,black_24px)]'
                : '',
        )}
      >
        {visible.length === 0 ? (
          <p className="px-3 pt-4 text-sm text-muted-foreground">
            {q ? 'No chats match.' : 'Your chats show up here.'}
          </p>
        ) : (
          groupChats(visible).map((g, gi) => (
            <section
              key={g.label}
              className={cn(
                gi > 0 && 'mt-2 border-t border-black/[0.05] pt-2 dark:border-white/[0.06]',
              )}
            >
              <h3
                suppressHydrationWarning
                className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase"
              >
                {g.label}
              </h3>
              <ul>
                {g.items.map((c) => {
                  const active = c.id === activeId;
                  const type = c.workType ? getWorkType(c.workType) : undefined;
                  const subtitle = type && type.name !== c.title ? type.name : undefined;
                  return (
                    <li key={c.id} className="group relative">
                      <Link
                        href={`/chat/${c.id}`}
                        onClick={onPick}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'block rounded-xl px-3 py-2 transition-colors',
                          active
                            ? 'bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]'
                            : 'hover:bg-black/[0.035] dark:hover:bg-white/5',
                        )}
                      >
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-[13.5px]',
                              active ? 'font-medium' : 'text-foreground/90',
                            )}
                          >
                            {c.title}
                          </span>
                          <span
                            suppressHydrationWarning
                            className="shrink-0 text-[11px] text-muted-foreground tabular-nums transition-opacity group-hover:opacity-0"
                          >
                            {when(c.lastMessageAt)}
                          </span>
                        </span>
                        {subtitle && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {subtitle}
                          </span>
                        )}
                      </Link>
                      {confirming === c.id ? (
                        <span className="absolute inset-y-1 right-1 flex items-center gap-0.5 rounded-lg bg-card pl-1.5 text-xs shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirming(undefined);
                              onDelete(c.id);
                            }}
                            className="rounded-md px-2 py-1 font-medium text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            aria-label="Keep the chat"
                            onClick={() => setConfirming(undefined)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete ${c.title}`}
                          onClick={() => setConfirming(c.id)}
                          className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 hover:text-foreground focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </nav>
    </div>
  );
}

/** Chat list on the left (wide screens). Pair it with `ChatSidebarSpacer` to keep the chat centred. */
export function ChatSidebar(props: Props) {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-black/[0.06] pr-4 lg:flex dark:border-white/10">
      <ChatList {...props} />
    </aside>
  );
}

/** "Chats" button that opens the list as a sheet (narrow screens). */
export function MobileChats(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground lg:hidden"
      >
        <History className="size-4" aria-hidden />
        Chats
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Your chats">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-surface p-4 shadow-(--shadow-float)"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[17px] font-semibold">Chats</span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-black/5"
                >
                  <X className="size-4" />
                </button>
              </div>
              <ChatList {...props} onPick={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Empty column as wide as the sidebar, on the right, so the conversation sits in the middle. */
export function ChatSidebarSpacer() {
  return <div aria-hidden className="hidden w-[142px] shrink-0 xl:block" />;
}
