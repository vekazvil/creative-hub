import type { RequestMode } from '../enums';
import { brandLabel, findBrand, type Brand } from './brands';
import { buildSections, F, isFilled, sectionValue, type FormSection } from './sections';
import type { FieldDef, FieldValue, RequestFormData, WorkType } from './types';
import { getWorkType } from './work-types';

export interface BriefRow {
  label: string;
  value: string;
  /** Section of the form to jump to when editing. */
  sectionId?: string;
}

export interface BriefSection {
  code: 'A' | 'B' | 'C' | 'D' | 'E';
  title: string;
  rows: BriefRow[];
}

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

export function displayValue(
  field: FieldDef,
  value: FieldValue | undefined,
  brands: readonly Brand[],
): string {
  if (!isFilled(value)) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (field.kind === 'date') return formatDate(value!);
  if (field.kind === 'brand') {
    const b = findBrand(brands, value!);
    return b ? brandLabel(b) : value!;
  }
  return value!;
}

export function subitemsText(type: WorkType): string {
  if (type.process) return 'Process to be decided for website work';
  return `Copy → Design → Review → Deployment${type.id === 'campaign' ? ' for each piece' : ''}`;
}

/** The brief the creative team gets, in sections A–E. Empty optional answers are left out. */
export function buildBrief(
  type: WorkType,
  mode: RequestMode,
  data: RequestFormData,
  requester: string,
  brands: readonly Brand[],
): BriefSection[] {
  const sections = buildSections(type, mode, data);
  const lookup = new Map<string, { section: FormSection; field: FieldDef }>();
  for (const s of sections)
    for (const f of s.fields)
      if (s.pieceIndex === undefined) lookup.set(f.id, { section: s, field: f });

  const row = (id: string, labelOverride?: string): BriefRow | null => {
    const hit = lookup.get(id);
    if (!hit) return null;
    const value = displayValue(hit.field, sectionValue(data, hit.section, id), brands);
    if (!value && !hit.field.required) return null;
    return { label: labelOverride ?? hit.field.label, value, sectionId: hit.section.id };
  };
  const rows = (list: (BriefRow | null)[]) => list.filter((r): r is BriefRow => r !== null);

  const typeSection = sections.find((s) => s.id === 'type')!;
  const production: BriefRow[] = [];
  if (mode === 'update')
    production.push(
      ...rows([row(F.currentFile, 'Current file or project'), row(F.changes), row(F.keep)]),
    );
  for (const f of typeSection.fields) {
    const value = displayValue(f, data.values[f.id], brands);
    if (value || f.required) production.push({ label: f.label, value, sectionId: 'type' });
  }
  for (const s of sections.filter((x) => x.pieceIndex !== undefined)) {
    const pt = getWorkType(data.pieces![s.pieceIndex!]!.type)!;
    const answered = s.fields
      .map((f) => [f.label, displayValue(f, sectionValue(data, s, f.id), brands)] as const)
      .filter(([, v]) => v)
      .map(([l, v]) => `${l}: ${v}`);
    production.push({
      label: `Piece ${s.pieceIndex! + 1}: ${pt.name}`,
      value: answered.join(' · '),
      sectionId: s.id,
    });
  }

  const brand = row(F.brand, 'Brand and co-brands');
  const co = displayValue(
    { id: F.coBrands, label: '', kind: 'text', required: false },
    data.values[F.coBrands],
    brands,
  );
  if (brand && co) brand.value = brand.value ? `${brand.value} + ${co}` : co;

  const draft = displayValue(
    { id: '', label: '', kind: 'date', required: true },
    data.values[F.firstDraft],
    brands,
  );
  const final = displayValue(
    { id: '', label: '', kind: 'date', required: true },
    data.values[F.finalFiles],
    brands,
  );

  return [
    {
      code: 'A',
      title: 'Overview',
      rows: rows([
        row(F.title),
        brand,
        { label: 'Type', value: type.name },
        {
          label: 'Kind of work',
          value: mode === 'update' ? 'Update of an existing asset' : 'New work',
        },
        row(F.priority),
        {
          label: 'First draft and final files',
          value: draft && final ? `${draft} · ${final}` : draft || final,
          sectionId: 'dates',
        },
        row(F.typeDate),
      ]),
    },
    {
      code: 'B',
      title: 'Strategy',
      rows: rows([
        row(F.objective),
        row(F.audience),
        row(F.message),
        row(F.language),
        row(F.products),
      ]),
    },
    { code: 'C', title: 'Production', rows: production },
    {
      code: 'D',
      title: 'Creative direction',
      rows: rows([
        row(F.freedom),
        row(F.budget),
        row(F.files, 'Files'),
        row(F.links, 'References and links'),
      ]),
    },
    {
      code: 'E',
      title: 'Management',
      rows: rows([
        row(F.approver),
        { label: 'Requester', value: requester },
        { label: 'Subitems', value: subitemsText(type) },
      ]),
    },
  ];
}
