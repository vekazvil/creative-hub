import { describe, expect, it } from 'vitest';

import {
  CUSTOM_TYPE_ID,
  customWorkType,
  fallbackGeneratedForm,
  generatedFormSchema,
  resolveWorkType,
  type GeneratedForm,
} from './generate';
import { buildSections, F, missingRequired } from './sections';

const field = (over: Partial<GeneratedForm['fields'][number]>) => ({
  label: 'Pages',
  kind: 'number' as const,
  required: true,
  options: [],
  placeholder: null,
  hint: null,
  half: true,
  ...over,
});

const form: GeneratedForm = {
  name: 'Recipe booklet',
  code: 'BOOK',
  summary: 'A printed booklet with recipes.',
  sampleTitle: 'Holiday recipe booklet',
  dateLabel: 'Print date',
  products: true,
  budget: true,
  tip: null,
  fields: [
    field({ label: 'Pages' }),
    field({ label: 'Pages' }),
    field({ label: 'Title', kind: 'text' }),
    field({ label: 'Paper', kind: 'choice', options: ['Matte'] }),
    field({ label: 'Finish', kind: 'multi', options: ['Gloss', 'Matte', 'Gloss'], required: false }),
  ],
};

describe('generated forms', () => {
  it('becomes a work type with unique ids that never take a shared field', () => {
    const type = customWorkType(form);
    expect(type.id).toBe(CUSTOM_TYPE_ID);
    const ids = type.fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(F.title);
    expect(ids.slice(0, 2)).toEqual(['x_pages', 'x_pages_2']);
  });

  it('asks a choice with fewer than two options as text, and drops duplicate options', () => {
    const [, , , paper, finish] = customWorkType(form).fields;
    expect(paper).toMatchObject({ kind: 'text' });
    expect(paper!.options).toBeUndefined();
    expect(finish!.options).toEqual(['Gloss', 'Matte']);
  });

  it('keeps the basics, dates and files around the generated questions', () => {
    const type = customWorkType(form);
    const sections = buildSections(type, 'new', { values: {}, form });
    expect(sections.map((s) => s.id)).toEqual(['basics', 'type', 'dates', 'budget', 'files']);
    const missing = missingRequired(sections, { values: {}, form }).map((m) => m.fieldId);
    expect(missing).toContain('x_pages');
    expect(missing).toContain(F.products);
  });

  it('resolves a stored request: ours by id, a generated one from its draft', () => {
    expect(resolveWorkType('sell')?.id).toBe('sell');
    expect(resolveWorkType(CUSTOM_TYPE_ID)).toBeUndefined();
    expect(resolveWorkType(CUSTOM_TYPE_ID, { values: {}, form })?.name).toBe('Recipe booklet');
  });

  it('has a demo form that passes its own schema', () => {
    const demo = fallbackGeneratedForm('A van wrap for the new Doña María line. Both sides.');
    expect(generatedFormSchema.parse(demo).name).toBe('A van wrap for the new Doña María line');
  });
});
