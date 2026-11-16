import { z } from 'zod';

import type { RequestMode } from '../enums';
import { approverLabel, type Approver } from './approvers';
import { brandLabel, type Brand } from './brands';
import { chatFields, mergeAnswers } from './intake';
import { buildSections } from './sections';
import type { FieldDef, RequestFormData, WorkType } from './types';

/*
 * Prefill: when a request starts from a description ("notes"), the model copies what the
 * description already says into the form's fields. The requester sees those fields marked
 * "From your notes" and checks them before sending. Nothing is guessed: a field the
 * description doesn't answer stays empty.
 */

export const prefillSchema = z.object({
  answers: z
    .array(
      z.object({
        fieldId: z.string(),
        values: z
          .array(z.string())
          .describe('One item for single answers; several for multi-select.'),
      }),
    )
    .describe('Only fields the description answers. Leave everything else out.'),
});
export type Prefill = z.infer<typeof prefillSchema>;

/** Fields a description can answer: the form's own fields, without files and system fields. */
export function prefillFields(type: WorkType, mode: RequestMode, data: RequestFormData) {
  return chatFields(buildSections(type, mode, data));
}

function describeField(f: FieldDef): string {
  const parts = [`- ${f.id} (${f.kind}): ${f.label}`];
  if (f.options) parts.push(`  options: ${f.options.map((o) => JSON.stringify(o)).join(', ')}`);
  return parts.join('\n');
}

export function prefillInstructions(opts: {
  type: WorkType;
  mode: RequestMode;
  data: RequestFormData;
  today: string;
  brands: readonly Brand[];
  approvers?: readonly Approver[];
}): string {
  const { type, mode, data, today, brands, approvers = [] } = opts;
  const active = approvers.filter((a) => a.active);
  return [
    'You fill in a request form for the creative team at Vilore Foods (La Costeña USA) from the description the requester wrote. The requester checks every answer before sending.',
    '',
    'Rules (strict):',
    '- Fill a field only when the description clearly answers it. Copy facts; never invent, guess or add defaults.',
    '- Leave out everything the description does not say. An empty answer is better than a wrong one.',
    '- Never fill product data (UPCs, GTINs, case data, net weights, SKU codes) unless it is written in the description, exactly as written.',
    '- Write text answers in the language of the description. Keep them short; a title is a few words.',
    '- choice fields: exactly one of the listed options, spelled exactly. multi fields: a subset of the options.',
    `- date fields: YYYY-MM-DD, only for dates the description gives. Today is ${today} (Texas). Resolve "next Friday" etc. from today. A date without a year is its next occurrence (never a past date).`,
    '- brand field: the brand code (e.g. "01") from the list below, also when another name for it is used. If the brand is not on the list, leave it out.',
    '- person field: the email of one person from the approvers list below, only when the description names them. Otherwise leave it out.',
    '- Plain punctuation: no em dashes (—).',
    '',
    `Work type: ${type.name}, ${mode === 'update' ? 'an update of something that exists' : 'new work'}.`,
    'Form fields (id, kind, label):',
    ...prefillFields(type, mode, data).map(describeField),
    '',
    'Brands (code short · name, other names in brackets):',
    ...brands.map(
      (b) => `- ${brandLabel(b)}${b.aliases.length ? ` (${b.aliases.join(', ')})` : ''}`,
    ),
    '',
    'Approvers (name · role, email):',
    ...(active.length ? active.map((a) => `- ${approverLabel(a)}, ${a.email}`) : ['- none']),
  ].join('\n');
}

/**
 * Checks the model's answers and writes the valid ones into the draft, marked as coming from
 * the notes. Answers the requester already gave are never overwritten.
 */
export function applyPrefill(
  type: WorkType,
  mode: RequestMode,
  data: RequestFormData,
  prefill: Prefill,
  brands: readonly Brand[],
  approvers: readonly Approver[] = [],
): { data: RequestFormData; filled: string[] } {
  const target = { values: { ...data.values }, meta: { ...data.meta } };
  const answers = prefill.answers
    .filter((a) => !(a.fieldId in data.values))
    .map((a) => ({ ...a, source: 'notes' as const, note: null }));
  mergeAnswers(target, prefillFields(type, mode, data), answers, brands, approvers);
  const filled = Object.keys(target.values).filter((id) => !(id in data.values));
  if (!filled.length) return { data, filled };
  // Only keep meta for what was filled here; brand misses must not drop existing answers.
  const values = { ...data.values };
  const meta = { ...data.meta };
  for (const id of filled) {
    values[id] = target.values[id]!;
    meta[id] = target.meta[id]!;
  }
  return { data: { ...data, values, meta }, filled };
}

/** Answers the requester hasn't checked yet: filled from the notes or suggested, never edited. */
export function uncheckedAnswers(data: RequestFormData): string[] {
  return Object.entries(data.meta ?? {})
    .filter(([id, m]) => m.source !== 'chat' && id in data.values)
    .map(([id]) => id);
}
