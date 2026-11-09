import type { RequestMode } from '../enums';
import type { FieldDef, FieldValue, RequestFormData, WorkType } from './types';
import { getWorkType } from './work-types';

export interface FormSection {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  tip?: string;
  fields: FieldDef[];
  /** Campaign piece sections: index into `RequestFormData.pieces`. */
  pieceIndex?: number;
}

/** Shared field ids, used across the app (title, brand, dates, …). */
export const F = {
  title: 'title',
  brand: 'brand',
  coBrands: 'co_brands',
  language: 'language',
  products: 'products',
  objective: 'objective',
  audience: 'audience',
  message: 'key_message',
  requester: 'requester',
  currentFile: 'current_file',
  changes: 'what_changes',
  keep: 'what_stays',
  firstDraft: 'first_draft',
  finalFiles: 'final_files',
  typeDate: 'type_date',
  approver: 'approver',
  priority: 'priority',
  freedom: 'creative_freedom',
  budget: 'budget',
  files: 'files',
  links: 'links',
} as const;

export const PRIORITY_OPTIONS = ['Normal', 'Urgent', 'Bomberazo'];

function basics(type: WorkType): FieldDef[] {
  return [
    {
      id: F.title,
      label: 'Title',
      kind: 'text',
      required: true,
      placeholder: `e.g. ${type.sampleTitle}`,
      half: true,
    },
    {
      id: F.brand,
      label: 'Brand',
      kind: 'brand',
      required: true,
      placeholder: 'Search brands, e.g. La Costeña',
      hint: 'A new name goes under a related brand until an admin confirms it.',
      half: true,
    },
    {
      id: F.coBrands,
      label: 'Co-brands',
      kind: 'text',
      required: false,
      placeholder: 'Partner or second brand, if any',
      half: true,
    },
    {
      id: F.language,
      label: 'Language',
      kind: 'choice',
      required: true,
      options: ['English', 'Spanish', 'Bilingual'],
      half: true,
    },
    ...(type.products
      ? [
          {
            id: F.products,
            label: 'Products and SKUs',
            kind: 'textarea',
            required: true,
            placeholder: 'One per line, with the UPC where it matters',
            hint: 'Product data is never filled in by AI.',
          } satisfies FieldDef,
        ]
      : []),
    {
      id: F.objective,
      label: 'Objective',
      kind: 'textarea',
      required: true,
      placeholder: 'What should this achieve? More than “sell more”.',
    },
    {
      id: F.audience,
      label: 'Audience',
      kind: 'text',
      required: true,
      placeholder: 'Who exactly, e.g. category buyers at Kroger',
    },
    {
      id: F.message,
      label: 'Key message or mandatory copy',
      kind: 'textarea',
      required: true,
      placeholder: 'The one thing it must say, plus lines that must appear',
    },
    {
      id: F.requester,
      label: 'Requester',
      kind: 'auto',
      required: false,
      hint: 'From your company account. The PM can send a request for someone else.',
    },
  ];
}

const updateFields: FieldDef[] = [
  {
    id: F.currentFile,
    label: 'Link to the current file or project',
    kind: 'text',
    required: true,
    placeholder: 'Drive link or project number, e.g. 01-.250',
  },
  {
    id: F.changes,
    label: 'What changes',
    kind: 'textarea',
    required: true,
    placeholder: 'e.g. new packaging shots and the new 8 oz size',
  },
  {
    id: F.keep,
    label: 'What must stay the same',
    kind: 'textarea',
    required: false,
    placeholder: 'e.g. layout, claims, legal lines',
  },
];

function dateFields(type: WorkType): FieldDef[] {
  return [
    {
      id: F.firstDraft,
      label: 'First draft',
      kind: 'date',
      required: true,
      half: true,
      hint: 'For your first round of feedback.',
    },
    { id: F.finalFiles, label: 'Final files', kind: 'date', required: true, half: true },
    { id: F.typeDate, label: type.dateLabel, kind: 'date', required: true, half: true },
    {
      id: F.approver,
      label: 'Approver',
      kind: 'person',
      required: true,
      placeholder: 'Who signs it off',
      half: true,
    },
    {
      id: F.priority,
      label: 'Priority',
      kind: 'choice',
      required: true,
      options: PRIORITY_OPTIONS,
      half: true,
      hint: 'Under 5 working days, the PM or creative manager approves first.',
    },
    {
      id: F.freedom,
      label: 'Creative freedom',
      kind: 'choice',
      required: true,
      options: ['Low', 'Medium', 'High'],
      half: true,
    },
  ];
}

const budgetFields: FieldDef[] = [
  {
    id: F.budget,
    label: 'Budget',
    kind: 'text',
    required: false,
    placeholder: 'Production and media, if known',
  },
];

const fileFields: FieldDef[] = [
  { id: F.files, label: 'Upload files', kind: 'file', required: false },
  {
    id: F.links,
    label: 'Links',
    kind: 'text',
    required: false,
    placeholder: 'Paste links to references or source files',
  },
];

/** The sections of the form for one work type, in order. */
export function buildSections(
  type: WorkType,
  mode: RequestMode,
  data?: RequestFormData,
): FormSection[] {
  const isCampaign = type.id === 'campaign';
  const sections: FormSection[] = [
    { id: 'basics', eyebrow: 'For every request', title: 'Basics', fields: basics(type) },
  ];
  if (mode === 'update') {
    sections.push({
      id: 'update',
      eyebrow: 'Update',
      title: 'What are we updating?',
      intro: 'Link the version that exists today, so nobody starts from scratch.',
      fields: updateFields,
    });
  }
  sections.push({
    id: 'type',
    eyebrow: type.code,
    title: isCampaign ? 'Campaign strategy' : `${type.name} details`,
    intro: isCampaign
      ? 'Asked once for the whole campaign. Each piece gets its own short form below.'
      : 'Only the questions this kind of work needs.',
    ...(type.tip && { tip: type.tip }),
    fields: type.fields,
  });
  if (isCampaign) {
    (data?.pieces ?? []).forEach((piece, i, all) => {
      const pt = getWorkType(piece.type);
      if (!pt) return;
      sections.push({
        id: `piece-${i}`,
        eyebrow: `Piece ${i + 1} of ${all.length} · ${pt.code}`,
        title: pt.name,
        fields: pt.fields,
        pieceIndex: i,
      });
    });
  }
  sections.push({
    id: 'dates',
    eyebrow: 'Dates and approval',
    title: 'When and who',
    intro: 'Real calendar dates only, counted in Texas working days.',
    fields: dateFields(type),
  });
  if (type.budget) {
    sections.push({
      id: 'budget',
      eyebrow: 'Budget',
      title: 'Budget',
      intro: 'Something here is produced or bought.',
      fields: budgetFields,
    });
  }
  sections.push({
    id: 'files',
    eyebrow: 'Files',
    title: 'References and source files',
    intro: 'Files go straight into the project folder.',
    fields: fileFields,
  });
  return sections;
}

export function isFilled(value: FieldValue | undefined): boolean {
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

export function sectionValue(data: RequestFormData, section: FormSection, fieldId: string) {
  return section.pieceIndex === undefined
    ? data.values[fieldId]
    : data.pieces?.[section.pieceIndex]?.values[fieldId];
}

export interface MissingField {
  sectionId: string;
  fieldId: string;
  label: string;
}

/** Required questions without an answer, in form order. */
export function missingRequired(sections: FormSection[], data: RequestFormData): MissingField[] {
  const missing: MissingField[] = [];
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.required && !isFilled(sectionValue(data, s, f.id))) {
        missing.push({ sectionId: s.id, fieldId: f.id, label: f.label });
      }
    }
  }
  return missing;
}

export function requiredCount(sections: FormSection[]): number {
  return sections.reduce((n, s) => n + s.fields.filter((f) => f.required).length, 0);
}
