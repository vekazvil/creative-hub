/** Kinds of questions a form can ask. */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'choice' // one of `options`
  | 'multi' // any of `options`
  | 'file'
  | 'brand' // searchable brand list
  | 'person' // searchable user list (plain text until `people` exists)
  | 'auto'; // filled by the system, read-only

export interface FieldDef {
  /** Stable key in the stored answers. */
  id: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** Takes half the row on wide screens. */
  half?: boolean;
}

export type WorkTypeGroup = 'top' | 'more' | 'special';

export interface WorkType {
  id: string;
  code: string;
  name: string;
  group: WorkTypeGroup;
  /** Number of past projects of this kind (from the Drive analysis). */
  past: number;
  examples: string;
  /** An example past project, shown as a hint. */
  similar: string;
  /** Label of the type-specific date, e.g. "Meeting date". */
  dateLabel: string;
  /** Asks for products and SKUs. */
  products: boolean;
  /** Asks for a budget (something is produced or bought). */
  budget: boolean;
  sampleTitle: string;
  tip?: string;
  /** Set when the work follows a different process than Copy → Design → Review → Deployment. */
  process?: string;
  fields: FieldDef[];
}

/** Compact authoring format used in `work-types.data.ts`. */
export interface RawField {
  label: string;
  kind: Exclude<FieldKind, 'brand' | 'person' | 'auto'>;
  req?: boolean;
  opts?: string[];
  ph?: string;
  hint?: string;
  half?: boolean;
}

export type RawWorkType = Omit<WorkType, 'fields'> & { fields: RawField[] };

/** One answer: text, a picked option, several options or file names. */
export type FieldValue = string | string[];
export type FieldValues = Record<string, FieldValue>;

/** Everything the requester has entered, stored as the draft and later as a brief version. */
export interface RequestFormData {
  values: FieldValues;
  /** Campaign only: one entry per piece, each with its own type and answers. */
  pieces?: { type: string; values: FieldValues }[];
  /** Notes the requester pasted at the start, kept for reference. */
  notes?: string;
  /** Where AI-filled answers came from. Removed for a field once the requester changes it. */
  meta?: Record<string, FieldMeta>;
}

export type FieldSource = 'chat' | 'ai';

export interface FieldMeta {
  /** "chat": the requester said it. "ai": the assistant's suggestion. */
  source: FieldSource;
  note?: string;
}
