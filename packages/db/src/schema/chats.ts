import { sql } from 'drizzle-orm';
import { bigint, boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';
import { chatRole } from './enums';
import { requests } from './requests';

/**
 * One intake conversation. Private to its owner. Starts before the work type is known,
 * so it lives apart from `requests` and links to the draft once the form is opened.
 */
export const chats = pgTable(
  'chats',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerEmail: text().notNull(),
    /** Shown in the chat list: the brief's title, else the work type, else the first message. */
    title: text(),
    /** The brief so far (`IntakeState`): work type, mode, answers and where each came from. */
    state: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Every required question that can be asked in chat is answered. */
    ready: boolean().notNull().default(false),
    /** The draft request made from this chat, once the requester opened the form. */
    requestId: uuid().references(() => requests.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Hidden from the owner; removed for good by a cleanup job (retention to be agreed). */
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('chats_owner_recent_idx').on(t.ownerEmail, t.lastMessageAt)],
);

/** Messages of a chat, in order. Appended, never edited. */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: chatRole().notNull(),
    content: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('chat_messages_chat_idx').on(t.chatId, t.id)],
);
