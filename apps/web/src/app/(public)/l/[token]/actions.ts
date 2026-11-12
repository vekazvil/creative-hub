'use server';

import {
  CUSTOM_TYPE_ID,
  fallbackGeneratedForm,
  generatedFormSchema,
  generateFormInstructions,
  REQUEST_MODES,
  type GeneratedForm,
  type RequestFormData,
} from '@creative-hub/core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAiClient, logAiCall } from '@/lib/ai';
import { getActiveLink } from '@/lib/public-links';
import { formDataSchema, getPublicRequest, PUBLIC_SENDER_EMAIL } from '@/lib/requests/data';
import { insertDraft, submitDraft, writeDraft } from '@/lib/requests/mutations';

/*
 * Actions behind a public link (/l/<token>). No sign-in: the link must exist and be on, and
 * requests are sent as a mock guest (PUBLIC_SENDER_EMAIL) until we decide how outside people
 * identify themselves. The link's owner sees every request that came through it.
 */

const VIA = 'public_link';

const createSchema = z.object({
  typeId: z.string(),
  mode: z.enum(REQUEST_MODES),
});

/** "Use one of our forms": a draft of the picked type. */
export async function createPublicDraft(token: string, input: z.infer<typeof createSchema>) {
  const link = await getActiveLink(token);
  const { typeId, mode } = createSchema.parse(input);
  const id = await insertDraft({
    email: PUBLIC_SENDER_EMAIL,
    typeId,
    mode,
    via: VIA,
    publicLinkId: link.id,
  });
  redirect(`/l/${token}/r/${id}`);
}

// The AI call is open to anyone with the link: a few per visitor per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const recent = new Map<string, number[]>();

async function allowAiCall(): Promise<boolean> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const calls = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (calls.length >= MAX_PER_WINDOW) return false;
  calls.push(now);
  recent.set(ip, calls);
  return true;
}

const describeSchema = z.string().trim().min(20).max(6000);

export type BuildFormResult = { ok: false; error: string };

/**
 * "Let AI build the form": the model writes the questions for what was described, then the
 * requester goes straight to that form, with the description kept as their notes.
 */
export async function buildFormWithAi(
  token: string,
  description: string,
): Promise<BuildFormResult> {
  const link = await getActiveLink(token);
  const parsed = describeSchema.safeParse(description);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Tell us a bit more: what gets made, for whom and where it will be used.',
    };
  }
  if (!(await allowAiCall())) {
    return {
      ok: false,
      error: 'That’s a lot of forms in a short time. Try again in a few minutes.',
    };
  }

  let form: GeneratedForm;
  const ai = getAiClient();
  if (ai.isFake) {
    form = fallbackGeneratedForm(parsed.data);
  } else {
    try {
      const res = await ai.structured({
        name: 'generated_form',
        instructions: generateFormInstructions(),
        messages: [{ role: 'user', content: parsed.data }],
        schema: generatedFormSchema,
      });
      await logAiCall(res.usage, PUBLIC_SENDER_EMAIL, 'generate_form');
      form = res.data;
    } catch (err) {
      console.error('generate_form failed', err);
      return { ok: false, error: 'The assistant didn’t answer. Try again in a moment.' };
    }
  }

  const id = await insertDraft({
    email: PUBLIC_SENDER_EMAIL,
    typeId: CUSTOM_TYPE_ID,
    mode: 'new',
    notes: parsed.data,
    via: VIA,
    form,
    publicLinkId: link.id,
  });
  redirect(`/l/${token}/r/${id}`);
}

/** Autosave. The generated form stays as stored: the client can't change it. */
export async function savePublicDraft(token: string, id: string, data: RequestFormData) {
  const link = await getActiveLink(token);
  const parsed = formDataSchema.parse(data) as RequestFormData;
  const { request, data: stored } = await getPublicRequest(link.id, id);
  if (request.status !== 'draft') return { ok: false as const, reason: 'not_draft' };
  await writeDraft(id, { ...parsed, form: stored.form });
  return { ok: true as const, savedAt: new Date().toISOString() };
}

export async function submitPublicRequest(token: string, id: string) {
  const link = await getActiveLink(token);
  const r = await getPublicRequest(link.id, id);
  if (r.request.status !== 'draft') redirect(`/l/${token}/r/${id}`);
  const res = await submitDraft(r, PUBLIC_SENDER_EMAIL);
  if (!res.ok) return res;
  redirect(`/l/${token}/r/${id}`);
}
