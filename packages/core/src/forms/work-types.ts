import type { FieldDef, RawField, WorkType } from './types';
import { RAW_WORK_TYPES } from './work-types.data';

/** "Who uses it" → "who_uses_it". Field ids are derived from labels. */
export function fieldId(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeField(f: RawField): FieldDef {
  return {
    id: fieldId(f.label),
    label: f.label,
    kind: f.kind,
    required: !!f.req,
    ...(f.opts && { options: f.opts }),
    ...(f.ph && { placeholder: f.ph }),
    ...(f.hint && { hint: f.hint }),
    ...(f.half && { half: true }),
  };
}

export const WORK_TYPES: WorkType[] = RAW_WORK_TYPES.map((t) => ({
  ...t,
  fields: t.fields.map(normalizeField),
}));

const byId = new Map(WORK_TYPES.map((t) => [t.id, t]));

export function getWorkType(id: string): WorkType | undefined {
  return byId.get(id);
}

/** Order shown to requesters: most requested, then campaign, then the rest. */
export function orderedWorkTypes(): WorkType[] {
  return [
    ...WORK_TYPES.filter((t) => t.group === 'top'),
    ...WORK_TYPES.filter((t) => t.group === 'special'),
    ...WORK_TYPES.filter((t) => t.group === 'more'),
  ];
}

/** Types a campaign can add as pieces. */
export const CAMPAIGN_PIECE_TYPES = [
  'social',
  'email',
  'ads',
  'video',
  'ecom',
  'pos',
  'event',
  'print',
  'photo',
] as const;

export const DEFAULT_CAMPAIGN_PIECES = ['social', 'email', 'ads'];
