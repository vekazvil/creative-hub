import 'server-only';

import {
  buildSections,
  CUSTOM_TYPE_ID,
  customWorkType,
  F,
  getWorkType,
  missingRequired,
  noticeCheck,
  type GeneratedForm,
  type Priority,
  type RequestFormData,
  type RequestMode,
  type WorkType,
} from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { emptyFormData } from './data';

const { requests, briefVersions, events, outbox } = schema;

/** Form version the answers are stored against. Bumped when work types change (gate 2). */
const FORM_VERSION = 1;

/**
 * A new draft of one of our work types, or of a generated form (`form` given).
 * `via` records where it started: describe box, chat, public link.
 */
export async function insertDraft(opts: {
  email: string;
  typeId: string;
  mode: RequestMode;
  notes?: string;
  via?: string;
  form?: GeneratedForm;
  /** The public link it was started on. */
  publicLinkId?: string;
}) {
  const { email, mode, via, form, publicLinkId } = opts;
  const type = form ? customWorkType(form) : getWorkType(opts.typeId);
  if (!type) throw new Error('Unknown work type');
  const notes = opts.notes?.trim() || undefined;
  const draft: RequestFormData = { ...emptyFormData(type.id, notes), ...(form && { form }) };
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(requests)
      .values({
        requesterEmail: email,
        submittedByEmail: email,
        workType: form ? CUSTOM_TYPE_ID : type.id,
        mode,
        publicLinkId: publicLinkId ?? null,
        draft: draft as unknown as Record<string, unknown>,
      })
      .returning({ id: requests.id });
    await tx.insert(events).values({
      requestId: row!.id,
      actorEmail: email,
      type: 'request.created',
      toStatus: 'draft',
      data: {
        workType: form ? CUSTOM_TYPE_ID : type.id,
        mode,
        ...(via && { via }),
        ...(form && { generatedForm: { name: form.name, fields: form.fields.length } }),
      },
    });
    return row!.id;
  });
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
export async function writeDraft(id: string, data: RequestFormData) {
  const v = data.values;
  await getDb()
    .update(requests)
    .set({
      draft: data as unknown as Record<string, unknown>,
      title: textOrNull(v[F.title]),
      brandCode: textOrNull(v[F.brand]),
      priority: PRIORITY[String(v[F.priority])] ?? 'normal',
      firstDraftOn: isoOrNull(v[F.firstDraft]),
      finalFilesOn: isoOrNull(v[F.finalFiles]),
    })
    .where(eq(requests.id, id));
}

/**
 * Turns a complete draft into brief version 1. Under 5 working days it waits for approval,
 * otherwise the project creation job is queued.
 */
export async function submitDraft(
  r: {
    request: (typeof requests)['$inferSelect'];
    type: WorkType;
    mode: RequestMode;
    data: RequestFormData;
  },
  actorEmail: string,
) {
  const { request, type, mode, data } = r;
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
      requestId: request.id,
      version: 1,
      formVersion: FORM_VERSION,
      data: data as unknown as Record<string, unknown>,
      createdByEmail: actorEmail,
    });
    await tx
      .update(requests)
      .set({ status: nextStatus, currentBriefVersion: 1, submittedAt: new Date() })
      .where(eq(requests.id, request.id));
    await tx.insert(events).values({
      requestId: request.id,
      actorEmail,
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
        .values({ requestId: request.id, kind: 'project.create', payload: { briefVersion: 1 } });
    }
  });
  return { ok: true as const };
}
