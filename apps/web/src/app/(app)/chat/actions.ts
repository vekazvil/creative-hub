'use server';

import {
  applyIntakeTurn,
  CHAT_HISTORY_WINDOW,
  chatTitle,
  emptyIntakeState,
  formatReply,
  getWorkType,
  intakeInstructions,
  intakeTurnSchema,
  todayInTexas,
  unknownBrandNote,
  type IntakeState,
} from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAiClient, logAiCall } from '@/lib/ai';
import { getBrands, suggestBrandName } from '@/lib/brands';
import { getOwnChat } from '@/lib/chats';
import { getDb } from '@/lib/db';
import { emptyFormData } from '@/lib/requests/data';
import { requireSession } from '@/lib/session';

const { chats, chatMessages, requests, events } = schema;

const contentSchema = z.string().trim().min(1).max(6000);

export type ChatTurnResult =
  | {
      ok: true;
      chatId: string;
      title: string;
      reply: string;
      state: IntakeState;
      ready: boolean;
      demo: boolean;
    }
  | { ok: false; error: string };

/**
 * One chat turn. The server reads the conversation from the database (the client only sends
 * the new message), asks the model, and saves both messages and the brief so far together.
 * A new chat is created on its first message.
 */
export async function sendChatMessage(
  chatId: string | null,
  text: string,
): Promise<ChatTurnResult> {
  const { user } = await requireSession();
  const parsed = contentSchema.safeParse(text);
  if (!parsed.success) return { ok: false, error: 'Write a message first.' };
  const content = parsed.data;

  let history: { role: 'user' | 'assistant'; content: string }[] = [];
  let state: IntakeState = emptyIntakeState();
  let firstMessage = content;
  if (chatId) {
    const own = await getOwnChat(chatId, user.email);
    history = own.messages;
    state = own.state;
    firstMessage = own.messages.find((m) => m.role === 'user')?.content ?? content;
  }

  // The model reads the recent messages; everything answered so far travels in the state.
  const msgs = [...history, { role: 'user' as const, content }].slice(-CHAT_HISTORY_WINDOW);
  const ai = getAiClient();
  const today = todayInTexas();
  const brands = await getBrands();
  const unknownBrands = new Set<string>();

  let reply: string;
  let ready: boolean;
  try {
    const ask = async (s: IntakeState, notes: string[] = []) => {
      const res = await ai.structured({
        name: 'intake_turn',
        instructions: intakeInstructions(s, today, user.name, brands, notes),
        messages: msgs,
        schema: intakeTurnSchema,
      });
      if (!ai.isFake) await logAiCall(res.usage, user.email, 'intake');
      return res.data;
    };
    const apply = (t: Awaited<ReturnType<typeof ask>>) => {
      const res = applyIntakeTurn(state, t, brands);
      res.unknownBrands.forEach((b) => unknownBrands.add(b));
      return res.state;
    };

    let turn = await ask(state);
    const typeBefore = state.workType;
    state = apply(turn);
    // The type became clear in this turn: ask again with its fields, so nothing said so far is lost.
    if (!typeBefore && state.workType && !ai.isFake) {
      turn = await ask(state);
      state = apply(turn);
    }
    // A brand name we don't know: ask once more so the reply says so instead of pretending.
    if (unknownBrands.size && !ai.isFake) {
      turn = await ask(state, [...unknownBrands].map(unknownBrandNote));
      state = applyIntakeTurn(state, turn, brands).state;
    }
    reply = formatReply(turn.reply);
    ready = turn.ready;
  } catch (err) {
    console.error('sendChatMessage failed', err);
    return { ok: false, error: 'The assistant didn’t answer. Try again in a moment.' };
  }

  // It waits for an admin; the field stays empty until then.
  await Promise.all([...unknownBrands].map((b) => suggestBrandName(b, user.email)));

  const title = chatTitle(state, firstMessage);
  const id = await getDb().transaction(async (tx) => {
    let id = chatId;
    if (!id) {
      const [row] = await tx
        .insert(chats)
        .values({ ownerEmail: user.email })
        .returning({ id: chats.id });
      id = row!.id;
    }
    await tx.insert(chatMessages).values([
      { chatId: id, role: 'user', content },
      { chatId: id, role: 'assistant', content: reply },
    ]);
    await tx
      .update(chats)
      .set({
        title,
        state: state as unknown as Record<string, unknown>,
        ready,
        lastMessageAt: new Date(),
      })
      .where(eq(chats.id, id));
    return id;
  });

  return { ok: true, chatId: id, title, reply, state, ready, demo: ai.isFake };
}

/**
 * Opens the form for a chat. The first time it creates the draft request from the brief so
 * far (with the conversation as notes); after that it opens the same draft again.
 */
export async function openFormFromChat(chatId: string) {
  const { user } = await requireSession();
  const { chat, state, messages } = await getOwnChat(chatId, user.email);

  if (chat.requestId) redirect(`/requests/${chat.requestId}`);

  const type = state.workType ? getWorkType(state.workType) : undefined;
  if (!type) throw new Error('No work type yet');

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'You' : 'Creative Hub'}: ${m.content}`)
    .join('\n\n');
  const draft = {
    ...emptyFormData(type.id),
    values: state.values,
    meta: state.meta,
    notes: transcript.slice(0, 20_000),
  };
  const requestId = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(requests)
      .values({
        requesterEmail: user.email,
        submittedByEmail: user.email,
        workType: type.id,
        mode: state.mode,
        title: typeof state.values.title === 'string' ? state.values.title : null,
        draft: draft as unknown as Record<string, unknown>,
      })
      .returning({ id: requests.id });
    await tx.update(chats).set({ requestId: row!.id }).where(eq(chats.id, chat.id));
    await tx.insert(events).values({
      requestId: row!.id,
      actorEmail: user.email,
      type: 'request.created',
      toStatus: 'draft',
      data: {
        workType: type.id,
        mode: state.mode,
        via: 'chat',
        chatId: chat.id,
        answers: Object.keys(state.values).length,
      },
    });
    return row!.id;
  });
  redirect(`/requests/${requestId}`);
}

/** Hides a chat from its owner. A request made from it stays as it is. */
export async function deleteChat(chatId: string) {
  const { user } = await requireSession();
  if (!z.uuid().safeParse(chatId).success) return;
  await getDb()
    .update(chats)
    .set({ deletedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.ownerEmail, user.email)));
}
