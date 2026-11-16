import { z } from 'zod';

import { F } from './sections';
import type { FieldDef, RequestFormData, WorkType } from './types';
import { fieldId, getWorkType, orderedWorkTypes } from './work-types';

/**
 * "Let AI build the form": when none of our forms fits, the model writes the questions for
 * this one piece of work. The basics, dates, budget and files are still asked by our own
 * sections, so the generated part is only what this kind of work needs.
 */

/** Work type id of a request whose form was generated. The form itself lives in the draft. */
export const CUSTOM_TYPE_ID = 'custom';

export const GENERATED_FIELD_KINDS = [
  'text',
  'textarea',
  'number',
  'date',
  'choice',
  'multi',
] as const;

const generatedFieldSchema = z.object({
  label: z.string().min(1).max(80).describe('The question, short, e.g. "Number of attendees".'),
  kind: z
    .enum(GENERATED_FIELD_KINDS)
    .describe(
      'text: one line. textarea: a few sentences. number. date. choice: one of options. multi: any of options.',
    ),
  required: z.boolean().describe('True only when the creative team cannot start without it.'),
  options: z
    .array(z.string().min(1).max(60))
    .max(10)
    .describe('2 to 8 options for choice and multi. Empty for every other kind.'),
  placeholder: z.string().max(120).nullable().describe('A concrete example answer, or null.'),
  hint: z.string().max(160).nullable().describe('One short line of help, or null.'),
  half: z.boolean().describe('True for short answers that can share a row with another one.'),
});

export const generatedFormSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(60)
    .describe('Name of the kind of work, like our form names, e.g. "Recipe booklet".'),
  code: z
    .string()
    .regex(/^[A-Z]{2,6}$/)
    .describe('2 to 6 capital letters, e.g. "BOOK".'),
  summary: z
    .string()
    .max(240)
    .describe('One sentence on what gets made, in the language of the description.'),
  sampleTitle: z.string().max(80).describe('An example request title for this work.'),
  dateLabel: z
    .string()
    .max(40)
    .describe('The date that matters besides first draft and final files, e.g. "Print date".'),
  products: z.boolean().describe('True when it shows specific products or SKUs.'),
  budget: z.boolean().describe('True when something is produced, printed or bought.'),
  tip: z.string().max(200).nullable().describe('One useful tip for the requester, or null.'),
  fields: z
    .array(generatedFieldSchema)
    .min(3)
    .max(12)
    .describe('The questions only this kind of work needs, 4 to 10 of them, in a sensible order.'),
});
export type GeneratedForm = z.infer<typeof generatedFormSchema>;

/**
 * The generated form as stored on the draft. The requester can drop questions they don't need:
 * `removed` holds their positions, so the questions themselves stay as AI wrote them and a removed
 * one can be brought back.
 */
export const storedFormSchema = generatedFormSchema.extend({
  removed: z.array(z.number().int().min(0)).max(12).optional(),
});
export type StoredForm = z.infer<typeof storedFormSchema>;

/**
 * The stored form with the requester's removals applied. Only `removed` comes from the client, so
 * questions can be dropped but never added or rewritten. At least one question always stays.
 */
export function withRemovedFields(
  stored: StoredForm,
  removed: readonly number[] | undefined,
): StoredForm {
  const valid = [...new Set(removed ?? [])]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < stored.fields.length)
    .sort((a, b) => a - b);
  if (valid.length >= stored.fields.length) return stored;
  const { removed: _old, ...form } = stored;
  return valid.length ? { ...form, removed: valid } : form;
}

/** What every form already asks, so the model does not ask it again. */
const ALREADY_ASKED =
  'title, brand, co-brands, language, products and SKUs, objective, audience, key message, requester, first draft date, final files date, approver, priority, creative freedom, budget, file uploads and links';

export function generateFormInstructions(): string {
  const catalog = orderedWorkTypes()
    .map((t) => `- ${t.name}: ${t.examples}`)
    .join('\n');
  return [
    'You design request forms for the creative team at Vilore Foods (La Costeña USA). Someone described work that none of the standard forms covers. Write the form for it.',
    `Every form already asks: ${ALREADY_ASKED}. Never repeat those. Write only the questions this kind of work needs: specs, sizes, quantities, formats, placements, content, deliverables.`,
    '- Ask what a designer or copywriter needs to start, nothing else. Mark required only what blocks the start.',
    '- Prefer choice or multi with clear options when the answers are predictable; text or textarea otherwise.',
    '- Write labels, options, placeholders, hints, summary and tip in the language the description is written in: English when it is in English, even with Spanish product or brand names; Spanish only when the description itself is in Spanish.',
    '- Plain punctuation: no em dashes (—); use a comma, a colon or a new sentence.',
    '',
    'Our standard forms, for the tone and level of detail (do not copy them):',
    catalog,
  ].join('\n');
}

/** Without AI: a generic but usable form, so the flow still works in demo mode. */
export function fallbackGeneratedForm(description: string): GeneratedForm {
  const first = description
    .trim()
    .split(/[.!?\n]/)[0]!
    .trim();
  const name = first.length > 2 && first.length <= 60 ? first : 'Custom request';
  return {
    name,
    code: 'AI',
    summary:
      'A form built from your description. AI isn’t connected, so the questions are generic.',
    sampleTitle: name,
    dateLabel: 'Go-live date',
    products: /\b(sku|product|jar|can|salsa|chipotle)\b/i.test(description),
    budget: true,
    tip: null,
    fields: [
      {
        label: 'What exactly gets made',
        kind: 'textarea',
        required: true,
        options: [],
        placeholder: 'Every deliverable, one per line',
        hint: null,
        half: false,
      },
      {
        label: 'Sizes or formats',
        kind: 'text',
        required: true,
        options: [],
        placeholder: 'e.g. 8.5 x 11 in, 1080 x 1350 px, PDF',
        hint: null,
        half: true,
      },
      {
        label: 'Quantity',
        kind: 'number',
        required: false,
        options: [],
        placeholder: null,
        hint: null,
        half: true,
      },
      {
        label: 'Where it will be used',
        kind: 'multi',
        required: true,
        options: ['Print', 'Digital', 'In store', 'Event', 'Internal'],
        placeholder: null,
        hint: null,
        half: false,
      },
      {
        label: 'Content it must include',
        kind: 'textarea',
        required: false,
        options: [],
        placeholder: 'Texts, logos, claims, contact details',
        hint: null,
        half: false,
      },
    ],
  };
}

/** Shared field ids: a generated question must not take one, or it would overwrite that answer. */
const RESERVED_IDS = new Set<string>(Object.values(F));

/**
 * Field id of every generated question, removed ones included, so an id never moves to another
 * question when one is removed or brought back.
 */
export function generatedFieldIds(form: GeneratedForm): string[] {
  const used = new Set(RESERVED_IDS);
  return form.fields.map((f) => {
    const base = fieldId(f.label) || 'question';
    let id = `x_${base}`;
    for (let n = 2; used.has(id); n++) id = `x_${base}_${n}`;
    used.add(id);
    return id;
  });
}

function toFields(form: StoredForm): FieldDef[] {
  const ids = generatedFieldIds(form);
  const removed = new Set(form.removed);
  const fields: FieldDef[] = [];
  for (const [i, f] of form.fields.entries()) {
    if (removed.has(i)) continue;
    const id = ids[i]!;
    const options = [...new Set(f.options.map((o) => o.trim()).filter(Boolean))];
    // A choice without options can't be answered: ask it as text instead.
    const kind =
      (f.kind === 'choice' || f.kind === 'multi') && options.length < 2 ? 'text' : f.kind;
    fields.push({
      id,
      label: f.label.trim(),
      kind,
      required: f.required,
      ...((kind === 'choice' || kind === 'multi') && { options }),
      ...(f.placeholder?.trim() && { placeholder: f.placeholder.trim() }),
      ...(f.hint?.trim() && { hint: f.hint.trim() }),
      ...(f.half && { half: true }),
    });
  }
  return fields;
}

/** A generated form as a work type, so the form, the checks and the brief treat it like any other. */
export function customWorkType(form: StoredForm): WorkType {
  return {
    id: CUSTOM_TYPE_ID,
    code: form.code,
    name: form.name,
    group: 'more',
    past: 0,
    examples: form.summary,
    similar: '',
    dateLabel: form.dateLabel || 'Key date',
    products: form.products,
    budget: form.budget,
    sampleTitle: form.sampleTitle || form.name,
    ...(form.tip && { tip: form.tip }),
    fields: toFields(form),
  };
}

/** The work type of a stored request: one of ours, or the one generated for it. */
export function resolveWorkType(typeId: string, data?: RequestFormData): WorkType | undefined {
  if (typeId === CUSTOM_TYPE_ID) return data?.form ? customWorkType(data.form) : undefined;
  return getWorkType(typeId);
}
