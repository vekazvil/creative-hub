'use client';

import {
  emptyIntakeState,
  findBrand,
  type Brand,
  getWorkType,
  summarizeIntake,
  type IntakeState,
  type IntakeSummary,
} from '@creative-hub/core';
import {
  ArrowRight,
  ArrowUp,
  ChevronRight,
  FileCheck2,
  FileText,
  Megaphone,
  RotateCcw,
  Tent,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type RefObject } from 'react';
import { toast } from 'sonner';

import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { ChatListItem } from '@/lib/chats';

import { deleteChat, openFormFromChat, sendChatMessage } from './actions';
import { ChatSidebar, ChatSidebarSpacer, MobileChats } from './chat-sidebar';

type Msg = { role: 'user' | 'assistant'; content: string };

const EXAMPLES = [
  {
    icon: FileText,
    title: 'Update a sell sheet',
    text: 'Update our Crispy Jalapeños foodservice sell sheet with the new 2 lb bag.',
  },
  {
    icon: Tent,
    title: 'Trade show banner',
    text: 'We need a retractable banner for Pizza Expo in Las Vegas.',
  },
  {
    icon: Megaphone,
    title: 'Social posts',
    text: 'Fiestas Patrias posts for Instagram and Facebook.',
  },
];

const ease = [0.32, 0.72, 0, 1] as const;

export function Chat({
  firstName,
  brands,
  initialMessage,
  chatId: initialChatId,
  initialMessages = [],
  initialState,
  initialReady = false,
  chats: initialChats,
}: {
  firstName: string;
  brands: Brand[];
  /** Written on the home page; sent as the first message. */
  initialMessage?: string;
  /** Set when continuing a saved chat. */
  chatId?: string;
  initialMessages?: Msg[];
  initialState?: IntakeState;
  initialReady?: boolean;
  /** The owner's chats, for the list on the side. */
  chats: ChatListItem[];
}) {
  const router = useRouter();
  const [chatId, setChatId] = useState(initialChatId);
  const [chatList, setChatList] = useState(initialChats);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [state, setState] = useState<IntakeState>(initialState ?? emptyIntakeState());
  const [ready, setReady] = useState(initialReady);
  const [demo, setDemo] = useState(false);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [creating, startCreate] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const type = state.workType ? getWorkType(state.workType) : undefined;
  const summary = summarizeIntake(state);
  const brand =
    typeof state.values.brand === 'string' ? findBrand(brands, state.values.brand) : undefined;
  const started = messages.length > 0;

  // Keep the newest message (or the typing dots, or the brief card) in view inside the panel.
  const showCard = ready && !!type && !!summary && !thinking;
  useEffect(() => {
    if (!started) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Wait a frame so the new message is laid out before measuring.
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, thinking, showCard, started]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const sentInitial = useRef(false);
  useEffect(() => {
    if (!initialMessage || sentInitial.current) return;
    sentInitial.current = true;
    window.history.replaceState(null, '', '/chat');
    void send(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  async function send(text = draft) {
    const content = text.trim();
    if (!content || thinking) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setThinking(true);
    const res = await sendChatMessage(chatId ?? null, content);
    setThinking(false);
    if (!res.ok) {
      toast.error(res.error);
      setMessages(messages);
      setDraft(content);
      return;
    }
    setMessages([...next, { role: 'assistant', content: res.reply }]);
    if (!chatId) {
      setChatId(res.chatId);
      // Saved now: give the chat its own address so a refresh or the back button finds it.
      window.history.replaceState(null, '', `/chat/${res.chatId}`);
    }
    setChatList((list) => [
      {
        id: res.chatId,
        title: res.title,
        workType: res.state.workType,
        lastMessageAt: new Date().toISOString(),
      },
      ...list.filter((c) => c.id !== res.chatId),
    ]);
    setState(res.state);
    setReady(res.ready);
    setDemo(res.demo);
    inputRef.current?.focus();
  }

  function openForm() {
    if (!chatId) return;
    startCreate(async () => {
      await openFormFromChat(chatId);
    });
  }

  /** Back to an empty chat. */
  function reset() {
    // Opened as a saved chat: its page is a different route, so navigate.
    if (initialChatId) {
      router.push('/chat');
      return;
    }
    // Started here on /chat (the address was only swapped in place): clear in place.
    window.history.replaceState(null, '', '/chat');
    setChatId(undefined);
    setMessages([]);
    setState(emptyIntakeState());
    setReady(false);
    setDraft('');
  }

  async function remove(id: string) {
    setChatList((list) => list.filter((c) => c.id !== id));
    await deleteChat(id);
    if (id === chatId) reset();
  }

  const composer = (
    <Composer
      inputRef={inputRef}
      value={draft}
      onChange={setDraft}
      onSend={() => void send()}
      disabled={thinking}
      placeholder={started ? 'Reply…' : 'Describe what you need…'}
    />
  );

  const footnote = (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-muted-foreground">
      {demo
        ? 'Demo mode: AI isn’t connected.'
        : 'Creative Hub can get things wrong. You check every field before anything is sent.'}
      <Link
        href="/requests/new"
        className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
      >
        Prefer a form? Pick the type
        <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </p>
  );

  return (
    <main className="mx-auto flex h-[calc(100dvh-var(--header-h)-var(--footer-h)-1px)] max-w-6xl gap-4 px-4 py-4 sm:px-6 sm:py-6">
      <ChatSidebar chats={chatList} activeId={chatId} onDelete={remove} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Soft blue light at the top, blurred so it has no edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[min(56rem,100%)] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />

        {!started ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-1 py-10 sm:px-2">
            <div className="absolute top-0 left-0 lg:hidden">
              <MobileChats chats={chatList} activeId={chatId} onDelete={remove} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="w-full max-w-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl"
                  />
                  <LogoMark className="relative size-12" />
                </div>
                <h1 className="mt-6 text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[38px]">
                  What are you working on, {firstName}?
                </h1>
                <p className="mt-3 max-w-md text-[17px] leading-relaxed text-muted-foreground">
                  Tell me in your own words. I’ll ask only what’s missing, then turn it into a brief
                  for the creative team.
                </p>
              </div>

              <div className="mt-8">{composer}</div>

              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {EXAMPLES.map(({ icon: Icon, title, text }, i) => (
                  <motion.li
                    key={title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.15 + i * 0.06 }}
                  >
                    <button
                      type="button"
                      onClick={() => send(text)}
                      className="group flex h-full w-full flex-col rounded-2xl bg-card p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all duration-300 ease-(--ease-apple) hover:-translate-y-0.5 hover:shadow-(--shadow-card)"
                    >
                      <Icon
                        className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden
                      />
                      <span className="mt-3 text-sm font-medium">{title}</span>
                      <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                        {text}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
              {footnote}
            </motion.div>
          </div>
        ) : (
          <>
            {/* Brief status */}
            <div className="relative flex items-center gap-3 px-1 py-2 sm:px-2">
              <MobileChats chats={chatList} activeId={chatId} onDelete={remove} />
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <Status on={!!type} label={type ? type.name : 'Working out the type'} />
                <span className="text-muted-foreground/40">/</span>
                <Status on={!!brand} label={brand ? brand.name : 'Brand not set'} />
                {state.mode === 'update' && (
                  <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                    Update
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-muted-foreground lg:hidden"
              >
                <RotateCcw aria-hidden />
                <span className="hidden sm:inline">New chat</span>
              </Button>
              {type && (
                <Button
                  size="sm"
                  variant={ready ? 'default' : 'secondary'}
                  onClick={openForm}
                  loading={creating}
                >
                  {ready ? 'Check the form' : 'Open the form'}
                </Button>
              )}
            </div>

            <div
              ref={scrollRef}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <ol className="mx-auto max-w-3xl space-y-8 px-1 py-8 sm:px-2">
                {messages.map((m, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease }}
                    className={cn('flex gap-4', m.role === 'user' && 'justify-end')}
                  >
                    {m.role === 'assistant' ? (
                      <>
                        <LogoMark className="mt-0.5 size-7 shrink-0" />
                        <div className="min-w-0 flex-1 pt-0.5 text-[16px] leading-[1.7] whitespace-pre-wrap text-foreground/90">
                          <span className="sr-only">Creative Hub:</span>
                          {m.content}
                        </div>
                      </>
                    ) : (
                      <div className="max-w-[80%] rounded-[22px] bg-card px-4 py-2.5 text-[16px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
                        <span className="sr-only">You:</span>
                        {m.content}
                      </div>
                    )}
                  </motion.li>
                ))}
                {thinking && (
                  <motion.li
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4"
                    aria-live="polite"
                  >
                    <LogoMark className="size-7 shrink-0" />
                    <span className="shimmer-text text-[15px] font-medium">Thinking…</span>
                  </motion.li>
                )}
              </ol>

              <AnimatePresence>
                {showCard && type && summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="mx-auto max-w-3xl px-1 pt-2 pb-10 sm:px-2"
                  >
                    <BriefCard
                      code={type.code}
                      title={
                        typeof state.values.title === 'string' && state.values.title
                          ? state.values.title
                          : type.name
                      }
                      summary={summary}
                      onOpen={openForm}
                      opening={creating}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative px-1 pt-2 pb-4 sm:px-2">
              {/* Messages fade out under the composer */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-surface to-transparent"
              />
              <div className="mx-auto max-w-3xl">
                {composer}
                {footnote}
              </div>
            </div>
          </>
        )}
      </div>
      <ChatSidebarSpacer />
    </main>
  );
}

function BriefCard({
  code,
  title,
  summary,
  onOpen,
  opening,
}: {
  code: string;
  title: string;
  summary: IntakeSummary;
  onOpen: () => void;
  opening: boolean;
}) {
  const answeredRequired = Math.max(summary.required - summary.missing, 0);
  const pct = summary.required ? Math.round((answeredRequired / summary.required) * 100) : 100;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <div className="ml-11 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.04),0_10px_24px_-12px_rgb(0_0_0/0.18)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <FileCheck2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold tracking-wide text-primary uppercase">Brief ready</span>
            <span aria-hidden>·</span>
            <span className="font-medium tracking-wide uppercase">{code}</span>
          </div>
          <div className="mt-0.5 truncate text-[16px] font-semibold">{title}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {answeredRequired} of {summary.required}
            </span>{' '}
            required answered
          </span>
          <span className="text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease, delay: 0.15 }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {plural(summary.suggestions, 'AI suggestion')} to confirm
          {summary.missing > 0 && <> · the rest you add in the form</>}
        </p>
        <Button size="sm" onClick={onOpen} loading={opening}>
          Check the form
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  const canSend = !!value.trim() && !disabled;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="rounded-[26px] bg-background p-2 shadow-[0_0_0_1px_rgb(0_0_0/0.07),0_2px_4px_rgb(0_0_0/0.03),0_12px_32px_-8px_rgb(0_0_0/0.12)] transition-shadow duration-300 focus-within:shadow-[0_0_0_1px_rgb(0_113_227/0.45),0_0_0_5px_rgb(0_113_227/0.10),0_12px_32px_-8px_rgb(0_0_0/0.14)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.12)]"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message Creative Hub
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          id="chat-input"
          rows={1}
          value={value}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="block max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[16px] leading-6 outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-(--ease-apple)',
            canSend
              ? 'bg-foreground text-background hover:scale-105 active:scale-95'
              : 'bg-secondary text-muted-foreground/60',
          )}
        >
          <ArrowUp className="size-5" strokeWidth={2.25} />
        </button>
      </div>
    </form>
  );
}

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <motion.span layout className="flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full transition-colors',
          on ? 'bg-success' : 'bg-muted-foreground/30',
        )}
      />
      <span className={cn('truncate', on ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
    </motion.span>
  );
}
