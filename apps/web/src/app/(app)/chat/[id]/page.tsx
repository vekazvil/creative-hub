import type { Metadata } from 'next';

import { getBrands } from '@/lib/brands';
import { getOwnChat, listChats } from '@/lib/chats';
import { requireSession } from '@/lib/session';

import { Chat } from '../chat';

export const metadata: Metadata = { title: 'Chat' };

/** A saved chat, continued where it was left. Only its owner can open it. */
export default async function SavedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSession();
  const [{ chat, state, messages }, brands, chats] = await Promise.all([
    getOwnChat(id, user.email),
    getBrands(),
    listChats(user.email),
  ]);
  return (
    <Chat
      // A different chat is a fresh component, not the previous one's state.
      key={chat.id}
      firstName={user.name.split(' ')[0] ?? user.name}
      brands={brands}
      chats={chats}
      chatId={chat.id}
      initialMessages={messages}
      initialState={state}
      initialReady={chat.ready}
    />
  );
}
