import 'server-only';

import { emptyIntakeState, formatReply, type IntakeState } from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { getDb } from './db';

const { chats, chatMessages } = schema;

export const intakeStateSchema = z.object({
  workType: z.string().nullable(),
  mode: z.enum(['new', 'update']),
  values: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  meta: z.record(
    z.string(),
    z.object({ source: z.enum(['chat', 'ai']), note: z.string().optional() }),
  ),
});

export function readIntakeState(raw: unknown): IntakeState {
  const parsed = intakeStateSchema.safeParse(raw);
  return parsed.success ? (parsed.data as IntakeState) : emptyIntakeState();
}

export type ChatListItem = {
  id: string;
  title: string;
  workType: string | null;
  lastMessageAt: string;
};

/** The owner's chats, most recent first. */
export async function listChats(email: string, limit = 50): Promise<ChatListItem[]> {
  const rows = await getDb()
    .select({
      id: chats.id,
      title: chats.title,
      state: chats.state,
      lastMessageAt: chats.lastMessageAt,
    })
    .from(chats)
    .where(and(eq(chats.ownerEmail, email), isNull(chats.deletedAt)))
    .orderBy(desc(chats.lastMessageAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? 'New chat',
    workType: readIntakeState(r.state).workType,
    lastMessageAt: r.lastMessageAt.toISOString(),
  }));
}

/** A chat and its messages, only for its owner. Anyone else gets a 404. */
export async function getOwnChat(id: string, email: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.ownerEmail, email), isNull(chats.deletedAt)))
    .limit(1);
  if (!chat) notFound();
  const messages = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id))
    .orderBy(asc(chatMessages.id));
  return {
    chat,
    state: readIntakeState(chat.state),
    // Older replies were saved before numbered questions were split into lines.
    messages: messages.map((m) =>
      m.role === 'assistant' ? { ...m, content: formatReply(m.content) } : m,
    ),
  };
}
