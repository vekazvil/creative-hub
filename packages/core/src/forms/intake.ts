import { z } from 'zod';

import type { RequestMode } from '../enums';
import { approverLabel, matchApprover, type Approver } from './approvers';
import { brandLabel, matchBrand, type Brand } from './brands';
import {
  buildSections,
  isFilled,
  missingRequired,
  requiredCount,
  type FormSection,
} from './sections';
import type { FieldDef, FieldMeta, FieldValue, RequestFormData, WorkType } from './types';
import { getWorkType, orderedWorkTypes } from './work-types';

/** What the model returns on every chat turn. */
// Field order matters: the model writes the answers and what is still missing first,
// then the reply, so the reply can ask exactly for what is missing.
export const intakeTurnSchema = z.object({
  workType: z
    .string()
    .nullable()
    .describe('Work type id from the catalog, or null if not clear yet.'),
  mode: z.enum(['new', 'update']).nullable(),
  answers: z
    .array(
      z.object({
        fieldId: z.string(),
        values: z
          .array(z.string())
          .describe('One item for single answers; several for multi-select.'),
        source: z.enum(['chat', 'ai']),
        note: z.string().nullable().describe('Required for source "ai": why you suggest it.'),
      }),
    )
    .describe('Answers that are new or changed, from anywhere in the conversation.'),
  stillMissing: z
    .array(z.string())
    .describe(
      'Ids of required fields still unanswered after these answers (excluding file fields).',
    ),
  reply: z
    .string()
    .describe(
      'One sentence of what you understood, then numbered questions for up to 3 of stillMissing.',
    ),
  ready: z.boolean().describe('True when stillMissing is empty.'),
});
export type IntakeTurn = z.infer<typeof intakeTurnSchema>;

/** Chat state kept by the client and sent back every turn. */
export interface IntakeState {
  workType: string | null;
  mode: RequestMode;
  values: Record<string, FieldValue>;
  meta: Record<string, FieldMeta>;
}

export const emptyIntakeState = (): IntakeState => ({
  workType: null,
  mode: 'new',
  values: {},
  meta: {},
});

/** Fields the chat may fill: everything except files and system fields. */
function chatFields(sections: FormSection[]): FieldDef[] {
  return sections
    .filter((s) => s.pieceIndex === undefined)
    .flatMap((s) => s.fields)
    .filter((f) => f.kind !== 'file' && f.kind !== 'auto');
}

function describeField(f: FieldDef, value: FieldValue | undefined): string {
  const parts = [`- ${f.id} (${f.kind}${f.required ? ', required' : ''}): ${f.label}`];
  if (f.options) parts.push(`  options: ${f.options.map((o) => JSON.stringify(o)).join(', ')}`);
  if (f.placeholder) parts.push(`  hint: ${f.placeholder}`);
  if (isFilled(value)) parts.push(`  current answer: ${JSON.stringify(value)}`);
  return parts.join('\n');
}

export function intakeInstructions(
  state: IntakeState,
  today: string,
  requesterName: string,
  brands: readonly Brand[],
  /** Facts from the server the reply must reflect, e.g. a brand name that isn't on the list. */
  serverNotes: string[] = [],
  approvers: readonly Approver[] = [],
): string {
  const type = state.workType ? getWorkType(state.workType) : undefined;
  const catalog = orderedWorkTypes()
    .map((t) => `- ${t.id}: ${t.name} — ${t.examples}`)
    .join('\n');

  const lines = [
    `You are Creative Hub, the intake assistant for the creative team at Vilore Foods (La Costeña USA). You help ${requesterName} turn a request into a complete brief by filling in a form.`,
    '',
    'How to talk:',
    "- Be brief, warm and plain. Always reply in the language of the requester's latest message (English when they write in English). The form's Language field is the language of the deliverable, not of this chat.",
    '- Read the whole conversation, not just the last message. Fill every field the requester has already answered anywhere in it.',
    '- Start with one short sentence confirming what you understood. Never repeat the whole form back.',
    '- Plain punctuation: no em dashes (—); use a comma, a colon or a new sentence.',
    '- If required questions are still unanswered, end with them as concrete questions (at most 3, numbered, required first). Never say you need "a few details" without asking them.',
    '- Ask in plain words, not field ids. Group related questions (e.g. first draft and final files dates).',
    '- When every required question you can ask in chat is answered, say the brief is ready to check and set ready = true. Files and templates are added in the form, not in the chat.',
    '',
    'Rules for answers (strict):',
    '- Fill a field only with what the requester actually said or attached. Use source "chat" for that.',
    '- Never invent facts. If something is not said, leave it out and ask.',
    '- Never fill product data (UPCs, GTINs, case data, net weights, SKU codes) yourself — only copy what the requester wrote. Never make up a project number.',
    '- You may suggest a value with source "ai" only for wording (title, objective) or an obvious default; always give a short note why. The requester confirms it later.',
    '- choice fields: exactly one of the listed options, spelled exactly. multi fields: a subset of the options.',
    `- date fields: YYYY-MM-DD, only for dates the requester gave. Today is ${today} (Texas). Resolve "next Friday" etc. from today. A date without a year is its next occurrence (never a past date).`,
    '- brand field: the brand code (e.g. "01") when the brand is in the list below, also when the requester used another name for it. If they name a brand that is not in the list, return the name exactly as they said it; it goes to an admin, so ask which listed brand it belongs under.',
    '- person field (approver): the email of one person from the approvers list below. If the requester names someone who is not on the list, leave it out and say they can pick from the list in the form.',
    '- Return only answers that are new or changed in this turn.',
    '',
    'Brands (code short · name, other names in brackets):',
    ...brands.map(
      (b) => `- ${brandLabel(b)}${b.aliases.length ? ` (${b.aliases.join(', ')})` : ''}`,
    ),
    '',
    'Approvers (name · role, email):',
    ...(approvers.some((a) => a.active)
      ? approvers.filter((a) => a.active).map((a) => `- ${approverLabel(a)}, ${a.email}`)
      : ['- none yet']),
    '',
    'Work types (pick one id as soon as it is clear; "campaign" is for several pieces with one idea):',
    catalog,
  ];

  if (type) {
    const sections = buildSections(type, state.mode, { values: state.values });
    lines.push(
      '',
      `Current work type: ${type.id} (${type.name}), ${state.mode === 'update' ? 'an update of something that exists' : 'new work'}.`,
      'Form fields (id, kind, label):',
      ...chatFields(sections).map((f) => describeField(f, state.values[f.id])),
    );
    const missing = missingRequired(sections, { values: state.values }).filter((m) =>
      chatFields(sections).some((f) => f.id === m.fieldId),
    );
    lines.push(
      '',
      `Required questions still unanswered: ${missing.map((m) => m.fieldId).join(', ') || 'none'}.`,
    );
  } else {
    lines.push('', 'The work type is not known yet. Work it out from the conversation, or ask.');
  }
  if (serverNotes.length) {
    lines.push(
      '',
      'From the system (say this in your reply):',
      ...serverNotes.map((n) => `- ${n}`),
    );
  }
  return lines.join('\n');
}

/** What the reply must say about brand names that are not on the list. */
export function unknownBrandNote(name: string): string {
  return `The brand "${name}" is not on the brand list, so the Brand field is empty. It was sent to an admin. Ask which listed brand it belongs under (e.g. a parent brand), or whether it is new.`;
}

/** Checks the model's answers against the form and merges the valid ones into the state. */
export function applyIntakeTurn(
  state: IntakeState,
  turn: IntakeTurn,
  brands: readonly Brand[],
  approvers: readonly Approver[] = [],
): { state: IntakeState; rejected: string[]; unknownBrands: string[] } {
  const next: IntakeState = {
    workType: state.workType,
    mode: turn.mode ?? state.mode,
    values: { ...state.values },
    meta: { ...state.meta },
  };
  if (turn.workType && getWorkType(turn.workType)) next.workType = turn.workType;

  const rejected: string[] = [];
  const type: WorkType | undefined = next.workType ? getWorkType(next.workType) : undefined;
  if (!type)
    return { state: next, rejected: turn.answers.map((a) => a.fieldId), unknownBrands: [] };
  const unknownBrands: string[] = [];

  const fields = new Map(
    chatFields(buildSections(type, next.mode, { values: next.values })).map((f) => [f.id, f]),
  );
  for (const a of turn.answers) {
    const f = fields.get(a.fieldId);
    let note = a.note;
    let values = a.values;
    if (f?.kind === 'brand') {
      // The model may give a code, a name or another name for the brand; resolve it here.
      const said = a.values.map((v) => v.trim()).find(Boolean) ?? '';
      const hit = matchBrand(brands, said);
      if (!hit) {
        // A made-up code is just wrong; only a real name goes to an admin.
        if (said && !/^\d+\b/.test(said)) unknownBrands.push(said);
        // The requester named another brand: the old one no longer holds.
        delete next.values[f.id];
        delete next.meta[f.id];
        rejected.push(a.fieldId);
        continue;
      }
      if (hit.via) note ??= `“${hit.via}” is ${brandLabel(hit.brand)}`;
      values = [hit.brand.code];
    }
    if (f?.kind === 'person') {
      // Only someone on the approvers list; the model may give the email or the name.
      const hit = a.values.map((v) => matchApprover(approvers, v)).find(Boolean);
      if (!hit) {
        rejected.push(a.fieldId);
        continue;
      }
      values = [hit.email];
    }
    const value = f ? cleanValue(f, values) : undefined;
    // Product data only ever comes from the requester's own words.
    if (!f || value === undefined || (f.id === 'products' && a.source !== 'chat')) {
      rejected.push(a.fieldId);
      continue;
    }
    next.values[f.id] = value;
    next.meta[f.id] = { source: a.source, ...(note && { note }) };
  }
  return { state: next, rejected, unknownBrands };
}

function cleanValue(f: FieldDef, values: string[]): FieldValue | undefined {
  const vals = values.map((v) => v.trim()).filter(Boolean);
  if (vals.length === 0) return undefined;
  switch (f.kind) {
    case 'multi': {
      const ok = vals.filter((v) => f.options!.includes(v));
      return ok.length ? ok : undefined;
    }
    case 'choice':
      return f.options!.includes(vals[0]!) ? vals[0] : undefined;
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(vals[0]!) ? vals[0] : undefined;
    case 'number':
      return /^\d+(\.\d+)?$/.test(vals[0]!) ? vals[0] : undefined;
    default:
      return vals.join('\n');
  }
}

/**
 * Puts each numbered question on its own line. The model sometimes writes
 * "Got it. 1. … 2. … 3. …" in one paragraph.
 */
export function formatReply(reply: string): string {
  // "1." or "1)" at the start or after a space.
  if (!/(^|\s)1[.)]\s/.test(reply)) return reply.trim();
  return reply
    .replace(/[ \t]+(?=[1-9][.)]\s)/g, '\n')
    .replace(/(^|\n)([1-9])\)\s/g, '$1$2. ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Name of a chat in the list: the brief's title, else the work type, else the first message. */
export function chatTitle(state: IntakeState, firstMessage: string): string {
  const title = typeof state.values.title === 'string' ? state.values.title.trim() : '';
  if (title) return title.slice(0, 120);
  const type = state.workType ? getWorkType(state.workType) : undefined;
  if (type) return type.name;
  const text = firstMessage.trim().replace(/\s+/g, ' ');
  return text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
}

/** How many recent messages the model reads. The answers so far travel in the state. */
export const CHAT_HISTORY_WINDOW = 30;

export interface IntakeSummary {
  answered: number;
  suggestions: number;
  missing: number;
  /** Required questions on the form, in total. */
  required: number;
}

/** Counts for the "brief to check" card at the end of the chat. */
export function summarizeIntake(state: IntakeState): IntakeSummary | null {
  const type = state.workType ? getWorkType(state.workType) : undefined;
  if (!type) return null;
  const data: RequestFormData = { values: state.values };
  const sections = buildSections(type, state.mode, data);
  return {
    answered: Object.values(state.values).filter(isFilled).length,
    suggestions: Object.values(state.meta).filter((m) => m.source === 'ai').length,
    missing: missingRequired(sections, data).length,
    required: requiredCount(sections),
  };
}
