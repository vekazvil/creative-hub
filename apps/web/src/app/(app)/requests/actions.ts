'use server';

import {
  buildSections,
  F,
  getWorkType,
  missingRequired,
  noticeCheck,
  fallbackStartRoute,
  fallbackTypeSuggestion,
  normalizeTypeSuggestion,
  startRouteInstructions,
  startRouteSchema,
  typeSuggestionInstructions,
  typeSuggestionSchema,
  type StartRoute,
  type TypeSuggestionResult,
  REQUEST_MODES,
  type RequestMode,
  type Priority,
  type RequestFormData,
} from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAiClient, logAiCall } from '@/lib/ai';
import { getDb } from '@/lib/db';
import { emptyFormData, formDataSchema, getOwnRequest } from '@/lib/requests/data';
import { requireSession } from '@/lib/session';

const { requests, briefVersions, events, outbox } = schema;

/** Form version the answers are stored against. Bumped when work types change (gate 2). */
const FORM_VERSION = 1;

const createSchema = z.object({
  typeId: z.string(),
  mode: z.enum(REQUEST_MODES),
  notes: z.string().max(20_000).optional(),
});

export async function createDraft(input: z.infer<typeof createSchema>) {
  const { user } = await requireSession();
  const { typeId, mode, notes } = createSchema.parse(input);
  const id = await insertDraft(user.email, typeId, mode, notes);
  redirect(`/requests/${id}`);
}

async function insertDraft(
  email: string,
  typeId: string,
  mode: RequestMode,
  notes?: string,
  via?: string,
) {
  const type = getWorkType(typeId);
  if (!type) throw new Error('Unknown work type');
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(requests)
      .values({
        requesterEmail: email,
        submittedByEmail: email,
        workType: type.id,
        mode,
        draft: emptyFormData(type.id, notes?.trim() || undefined) as unknown as Record<
          string,
          unknown
        >,
      })
      .returning({ id: requests.id });
    await tx.insert(events).values({
      requestId: row!.id,
      actorEmail: email,
      type: 'request.created',
      toStatus: 'draft',
      data: { workType: type.id, mode, ...(via && { via }) },
    });
    return row!.id;
  });
}

export type DescribeResult = { ok: false; error: string };

/**
 * "Not sure where to start?" on the home page: reads a free description and takes the
 * requester to the right place — a form of the right type (with the text kept as notes),
 * the list of request types, their requests, or the chat with the text as the first message.
 */
export async function routeDescription(text: string): Promise<DescribeResult> {
  const { user } = await requireSession();
  const description = z.string().trim().min(3).max(6000).safeParse(text);
  if (!description.success) return { ok: false, error: 'Tell us a bit more about what you need.' };

  let route: StartRoute | undefined;
  const ai = getAiClient();
  if (!ai.isFake) {
    try {
      const res = await ai.structured({
        name: 'start_route',
        instructions: startRouteInstructions(),
        messages: [{ role: 'user', content: description.data }],
        schema: startRouteSchema,
      });
      await logAiCall(res.usage, user.email, 'start_route');
      route = res.data;
    } catch (err) {
      console.error('start_route failed', err);
    }
  }
  route ??= fallbackStartRoute(description.data);

  if (route.destination === 'my_requests') redirect('/requests');
  if (route.destination === 'pick_type') redirect('/requests/new');
  if (route.destination === 'form' && route.workType && getWorkType(route.workType)) {
    const id = await insertDraft(
      user.email,
      route.workType,
      route.mode,
      description.data,
      'describe',
    );
    redirect(`/requests/${id}`);
  }
  redirect(`/chat?q=${encodeURIComponent(description.data)}`);
}

const suggestSchema = z.object({
  notes: z.string().trim().min(8).max(6000),
  /** The model's question and the requester's answer, on the second round. */
  followUp: z
    .object({ question: z.string().max(1000), answer: z.string().trim().min(1).max(2000) })
    .optional(),
});

export type SuggestTypeResult =
  { ok: true; suggestion: TypeSuggestionResult; demo: boolean } | { ok: false; error: string };

/**
 * "Suggest a type" on the new request page: the model reads the notes and picks the form, names
 * alternatives when two could fit, or asks one question when it cannot tell. Without a key the
 * keyword matcher answers.
 */
export async function suggestRequestType(
  input: z.infer<typeof suggestSchema>,
): Promise<SuggestTypeResult> {
  const { user } = await requireSession();
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Tell us a bit more about what you need.' };
  const { notes, followUp } = parsed.data;

  const ai = getAiClient();
  if (ai.isFake) {
    const text = followUp ? `${notes}\n${followUp.answer}` : notes;
    return { ok: true, suggestion: fallbackTypeSuggestion(text), demo: true };
  }

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: notes },
  ];
  if (followUp) {
    messages.push(
      { role: 'assistant', content: followUp.question },
      { role: 'user', content: followUp.answer },
    );
  }
  try {
    const res = await ai.structured({
      name: 'type_suggestion',
      instructions: typeSuggestionInstructions(!!followUp),
      messages,
      schema: typeSuggestionSchema,
    });
    await logAiCall(res.usage, user.email, 'type_suggestion');
    return { ok: true, suggestion: normalizeTypeSuggestion(res.data), demo: false };
  } catch (err) {
    console.error('type_suggestion failed', err);
    return { ok: false, error: 'The assistant didn’t answer. Pick a type below or try again.' };
  }
}

const PRIORITY: Record<string, Priority> = {
  Normal: 'normal',
  Urgent: 'urgent',
  Bomberazo: 'bomberazo',
};
const isoOrNull = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
const textOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Autosave. Also copies the fields we filter and sort by into their own columns. */
export async function saveDraft(id: string, data: RequestFormData) {
  const { user } = await requireSession();
  const parsed = formDataSchema.parse(data);
  const { request } = await getOwnRequest(id, user.email);
  if (request.status !== 'draft') return { ok: false as const, reason: 'not_draft' };

  const v = parsed.values;
  await getDb()
    .update(requests)
    .set({
      draft: parsed as unknown as Record<string, unknown>,
      title: textOrNull(v[F.title]),
      brandCode: textOrNull(v[F.brand]),
      priority: PRIORITY[String(v[F.priority])] ?? 'normal',
      firstDraftOn: isoOrNull(v[F.firstDraft]),
      finalFilesOn: isoOrNull(v[F.finalFiles]),
    })
    .where(eq(requests.id, id));
  return { ok: true as const, savedAt: new Date().toISOString() };
}

export async function submitRequest(id: string) {
  const { user } = await requireSession();
  const { request, type, mode, data } = await getOwnRequest(id, user.email);
  if (request.status !== 'draft') redirect(`/requests/${id}`);

  const missing = missingRequired(buildSections(type, mode, data), data);
  if (missing.length > 0) {
    return { ok: false as const, missing: missing.map((m) => m.label) };
  }

  const notice = noticeCheck([
    request.firstDraftOn ?? undefined,
    request.finalFilesOn ?? undefined,
  ]);
  const urgent = notice?.urgent ?? false;
  const nextStatus = urgent ? 'pending_approval' : 'submitted';

  await getDb().transaction(async (tx) => {
    await tx.insert(briefVersions).values({
      requestId: id,
      version: 1,
      formVersion: FORM_VERSION,
      data: data as unknown as Record<string, unknown>,
      createdByEmail: user.email,
    });
    await tx
      .update(requests)
      .set({ status: nextStatus, currentBriefVersion: 1, submittedAt: new Date() })
      .where(eq(requests.id, id));
    await tx.insert(events).values({
      requestId: id,
      actorEmail: user.email,
      type: 'request.transition',
      fromStatus: 'draft',
      toStatus: nextStatus,
      briefVersion: 1,
      data: notice ? { workingDays: notice.workingDays, deadline: notice.deadline } : {},
    });
    // Urgent requests wait for approval; the creation job is queued once approved (task 3.5).
    if (!urgent) {
      await tx
        .insert(outbox)
        .values({ requestId: id, kind: 'project.create', payload: { briefVersion: 1 } });
    }
  });

  revalidatePath('/requests');
  redirect(`/requests/${id}`);
}

export async function deleteDraft(id: string) {
  const { user } = await requireSession();
  const { request } = await getOwnRequest(id, user.email);
  if (request.status !== 'draft') return;
  await getDb().transaction(async (tx) => {
    await tx.update(requests).set({ status: 'cancelled' }).where(eq(requests.id, id));
    await tx.insert(events).values({
      requestId: id,
      actorEmail: user.email,
      type: 'request.transition',
      fromStatus: 'draft',
      toStatus: 'cancelled',
    });
  });
  revalidatePath('/requests');
  redirect('/requests');
}
