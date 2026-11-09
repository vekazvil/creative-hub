import { describe, expect, it } from 'vitest';

import { TEST_BRANDS } from '../testing/brands';
import { fallbackStartRoute } from './pick';
import { searchBrands, matchBrand, normalizeBrandText } from './brands';
import { buildSections, F, missingRequired, requiredCount } from './sections';
import { fallbackTypeSuggestion, normalizeTypeSuggestion, suggestWorkType } from './suggest';
import { fieldId, getWorkType, orderedWorkTypes, WORK_TYPES } from './work-types';

describe('work types', () => {
  it('has 15 types plus campaign, with unique field ids per type', () => {
    expect(WORK_TYPES).toHaveLength(16);
    for (const t of WORK_TYPES) {
      const ids = t.fields.map((f) => f.id);
      expect(new Set(ids).size, t.id).toBe(ids.length);
    }
  });
  it('orders top types, then campaign, then the rest', () => {
    const ids = orderedWorkTypes().map((t) => t.id);
    expect(ids.slice(0, 7)).toEqual(['sell', 'ads', 'pack', 'event', 'deck', 'video', 'campaign']);
  });
  it('derives field ids from labels', () => {
    expect(fieldId('How it’s made')).toBe('how_it_s_made');
    expect(fieldId('Size, bleed and resolution')).toBe('size_bleed_and_resolution');
  });
});

describe('buildSections', () => {
  const sell = getWorkType('sell')!;

  it('adds update questions only in update mode', () => {
    expect(buildSections(sell, 'new').map((s) => s.id)).toEqual([
      'basics',
      'type',
      'dates',
      'files',
    ]);
    expect(buildSections(sell, 'update').map((s) => s.id)).toContain('update');
  });
  it('asks for products only when the type needs them', () => {
    const basics = (id: string) =>
      buildSections(getWorkType(id)!, 'new')[0]!.fields.map((f) => f.id);
    expect(basics('sell')).toContain(F.products);
    expect(basics('deck')).not.toContain(F.products);
  });
  it('adds a budget section for produced work', () => {
    expect(buildSections(getWorkType('event')!, 'new').map((s) => s.id)).toContain('budget');
  });
  it('adds one section per campaign piece', () => {
    const s = buildSections(getWorkType('campaign')!, 'new', {
      values: {},
      pieces: [
        { type: 'social', values: {} },
        { type: 'email', values: {} },
      ],
    });
    expect(s.filter((x) => x.pieceIndex !== undefined).map((x) => x.title)).toEqual([
      'Social media',
      'Email',
    ]);
  });
});

describe('missingRequired', () => {
  it('lists unanswered required questions and ignores optional ones', () => {
    const sections = buildSections(getWorkType('brand')!, 'new');
    const all = missingRequired(sections, { values: {} });
    expect(all).toHaveLength(requiredCount(sections));
    expect(all.find((m) => m.fieldId === F.coBrands)).toBeUndefined();

    const some = missingRequired(sections, {
      values: { [F.title]: 'Brand book', [F.language]: 'English' },
    });
    expect(some).toHaveLength(all.length - 2);
  });
  it('checks campaign piece answers separately', () => {
    const data = { values: {}, pieces: [{ type: 'email', values: { email_type: 'Newsletter' } }] };
    const sections = buildSections(getWorkType('campaign')!, 'new', data);
    const missing = missingRequired(sections, data).filter((m) => m.sectionId === 'piece-0');
    expect(missing.map((m) => m.fieldId)).not.toContain('email_type');
    expect(missing.length).toBeGreaterThan(0);
  });
});

describe('suggestWorkType', () => {
  it('suggests an event for a trade-show banner', () => {
    const s = suggestWorkType(
      'We need a retractable banner for Pizza Expo in Las Vegas, showing three foodservice products.',
    );
    expect(s?.type.id).toBe('event');
    expect(s?.matched).toContain('banner');
  });
  it('returns null when nothing matches', () => {
    expect(suggestWorkType('hello there')).toBeNull();
  });
});

describe('type suggestion', () => {
  it('falls back to keywords as "likely", and to "unclear" without a match', () => {
    expect(fallbackTypeSuggestion('A retractable banner for Pizza Expo')).toMatchObject({
      workType: 'event',
      confidence: 'likely',
      question: null,
    });
    expect(fallbackTypeSuggestion('Update the existing sell sheet for 2027')).toMatchObject({
      workType: 'sell',
      mode: 'update',
    });
    expect(fallbackTypeSuggestion('hello there')).toMatchObject({
      workType: null,
      confidence: 'unclear',
      question: null,
    });
  });
  it('drops unknown ids and keeps the decision consistent', () => {
    expect(
      normalizeTypeSuggestion({
        workType: 'nope',
        confidence: 'sure',
        alternatives: ['sell', 'nope', 'sell'],
        mode: null,
        reason: '',
        question: 'Which one?',
      }),
    ).toMatchObject({
      workType: null,
      confidence: 'unclear',
      alternatives: ['sell'],
      question: 'Which one?',
    });
    expect(
      normalizeTypeSuggestion({
        workType: 'sell',
        confidence: 'unclear',
        alternatives: ['sell', 'deck'],
        mode: 'update',
        reason: '',
        question: 'Which?',
      }),
    ).toMatchObject({
      workType: 'sell',
      confidence: 'likely',
      alternatives: ['deck'],
      question: null,
    });
  });
});

describe('buildBrief', () => {
  it('builds sections A–E with formatted values and skips empty optional answers', async () => {
    const { buildBrief } = await import('./brief');
    const brief = buildBrief(
      getWorkType('sell')!,
      'new',
      {
        values: {
          [F.title]: 'Crispy Jalapeños sell sheet',
          [F.brand]: '01',
          [F.firstDraft]: '2026-11-13',
        },
      },
      'Lucia Ramos',
      TEST_BRANDS,
    );
    expect(brief.map((s) => s.code)).toEqual(['A', 'B', 'C', 'D', 'E']);
    const overview = brief[0]!.rows;
    expect(overview.find((r) => r.label === 'Brand and co-brands')?.value).toBe(
      '01 LC · La Costeña',
    );
    expect(overview.find((r) => r.label === 'First draft and final files')?.value).toBe(
      'Fri, Nov 13, 2026',
    );
    expect(brief[3]!.rows.find((r) => r.label === 'Budget')).toBeUndefined();
    expect(brief[4]!.rows.find((r) => r.label === 'Requester')?.value).toBe('Lucia Ramos');
  });
});

describe('brands', () => {
  it('normalizes accents, case and punctuation', () => {
    expect(normalizeBrandText('  La Costeña®  ')).toBe('la costena');
    expect(normalizeBrandText('Cal-C-Tose')).toBe('cal c tose');
  });

  it('matches only whole names, not parts', () => {
    expect(matchBrand(TEST_BRANDS, 'costena')?.brand.code).toBe('01');
    expect(matchBrand(TEST_BRANDS, 'costena')?.via).toBe('Costeña');
    expect(matchBrand(TEST_BRANDS, 'Tia Lupita')?.via).toBeUndefined();
    expect(matchBrand(TEST_BRANDS, 'Costeña beans')).toBeUndefined();
    expect(matchBrand(TEST_BRANDS, '')).toBeUndefined();
  });

  it('accepts the list label the model may copy', () => {
    for (const said of ['18 CT · Chocomilk', '18 CT', '18 Chocomilk']) {
      expect(matchBrand(TEST_BRANDS, said)?.brand.code).toBe('18');
    }
    expect(matchBrand(TEST_BRANDS, '18 LC')).toBeUndefined();
    expect(matchBrand(TEST_BRANDS, '99 XY')).toBeUndefined();
  });

  it('searches names and other names, best match first', () => {
    expect(searchBrands(TEST_BRANDS, 'cos').map((m) => m.brand.code)).toEqual(['01']);
    expect(searchBrands(TEST_BRANDS, 'milk')).toEqual([
      { brand: TEST_BRANDS[4], via: 'Choco Milk' },
    ]);
    expect(searchBrands(TEST_BRANDS, 'multiple')[0]?.via).toBe('Multiple brands');
    expect(searchBrands(TEST_BRANDS, '')).toHaveLength(TEST_BRANDS.length);
  });
});

describe('fallbackStartRoute', () => {
  it('opens a form, the requests list or the chat', () => {
    expect(fallbackStartRoute('We need a retractable banner for Pizza Expo')).toMatchObject({
      destination: 'form',
      workType: 'event',
    });
    expect(fallbackStartRoute('What is the status of my sell sheet?').destination).toBe(
      'my_requests',
    );
    expect(fallbackStartRoute('Show me all request types').destination).toBe('pick_type');
    expect(fallbackStartRoute('I want to pick the form myself').destination).toBe('pick_type');
    expect(fallbackStartRoute('not sure what to pick, help me').destination).toBe('chat');
  });
});
