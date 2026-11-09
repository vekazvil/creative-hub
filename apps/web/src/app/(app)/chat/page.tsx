import type { Metadata } from 'next';

import { getBrands } from '@/lib/brands';
import { listChats } from '@/lib/chats';
import { requireSession } from '@/lib/session';

import { Chat } from './chat';

export const metadata: Metadata = { title: 'Chat' };

/** A new chat. It is saved, and gets its own address, with the first message. */
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { user } = await requireSession();
  const { q } = await searchParams;
  const [brands, chats] = await Promise.all([getBrands(), listChats(user.email)]);
  return (
    <Chat
      key="new"
      firstName={user.name.split(' ')[0] ?? user.name}
      brands={brands}
      chats={chats}
      initialMessage={typeof q === 'string' ? q.trim().slice(0, 6000) || undefined : undefined}
    />
  );
}
