import { describe, expect, it } from 'vitest';

import {
  applyIntakeTurn,
  chatTitle,
  emptyIntakeState,
  formatReply,
  intakeInstructions,
  summarizeIntake,
  type IntakeTurn,
} from './intake';
import { TEST_BRANDS } from '../testing/brands';

const turn = (t: Partial<IntakeTurn>): IntakeTurn => ({
  reply: '',
  workType: null,
  mode: null,
  answers: [],
  stillMissing: [],
  ready: false,
  ...t,
});

describe('applyIntakeTurn', () => {
  it('sets the work type and keeps valid answers with their source', () => {
    const { state, rejected } = applyIntakeTurn(
      emptyIntakeState(),
      turn({
        workType: 'event',
        answers: [
          { fieldId: 'event_name', values: ['Pizza Expo'], source: 'chat', note: null },
          {
            fieldId: 'title',
            values: ['Pizza Expo banner'],
            source: 'ai',
            note: 'Written from the chat.',
          },
        ],
      }),
      TEST_BRANDS,
    );
    expect(state.workType).toBe('event');
    expect(state.values.event_name).toBe('Pizza Expo');
    expect(state.meta.title).toEqual({ source: 'ai', note: 'Written from the chat.' });
    expect(rejected).toEqual([]);
  });

  it('rejects unknown fields, invalid options, bad dates and unknown brands', () => {
    const { state, rejected } = applyIntakeTurn(
      { ...emptyIntakeState(), workType: 'event' },
      turn({
        answers: [
          { fieldId: 'nope', values: ['x'], source: 'chat', note: null },
          { fieldId: 'language', values: ['French'], source: 'chat', note: null },
          { fieldId: 'first_draft', values: ['next Friday'], source: 'chat', note: null },
          { fieldId: 'brand', values: ['99'], source: 'chat', note: null },
          { fieldId: 'pieces', values: ['Backdrop', 'Spaceship'], source: 'chat', note: null },
        ],
      }),
      TEST_BRANDS,
    );
    expect(rejected).toEqual(['nope', 'language', 'first_draft', 'brand']);
    expect(state.values.pieces).toEqual(['Backdrop']);
  });

  it('never accepts AI-suggested product data', () => {
    const { state, rejected } = applyIntakeTurn(
      { ...emptyIntakeState(), workType: 'sell' },
      turn({
        answers: [{ fieldId: 'products', values: ['UPC 123'], source: 'ai', note: 'guess' }],
      }),
      TEST_BRANDS,
    );
    expect(rejected).toEqual(['products']);
    expect(state.values.products).toBeUndefined();
  });

  it('ignores answers until a work type is known', () => {
    const { state, rejected } = applyIntakeTurn(
      emptyIntakeState(),
      turn({ answers: [{ fieldId: 'title', values: ['X'], source: 'chat', note: null }] }),
      TEST_BRANDS,
    );
    expect(state.values).toEqual({});
    expect(rejected).toEqual(['title']);
  });
});

describe('brands in the chat', () => {
  const sell = { ...emptyIntakeState(), workType: 'sell' };
  const brandTurn = (said: string) =>
    applyIntakeTurn(
      sell,
      turn({ answers: [{ fieldId: 'brand', values: [said], source: 'chat', note: null }] }),
      TEST_BRANDS,
    );

  it('resolves a code, a name without accents or a short code', () => {
    for (const said of ['01', 'La Costena', 'lc', 'LA COSTEÑA']) {
      expect(brandTurn(said).state.values.brand).toBe('01');
    }
  });

  it('resolves another name and says which brand it is', () => {
    const { state } = brandTurn('Choco Milk');
    expect(state.values.brand).toBe('18');
    expect(state.meta.brand?.note).toBe('“Choco Milk” is 18 CT · Chocomilk');
  });

  it('clears the brand when an unknown one is named, and reports the name for an admin', () => {
    const { state, rejected, unknownBrands } = applyIntakeTurn(
      { ...sell, values: { brand: '18' }, meta: { brand: { source: 'chat' } } },
      turn({
        answers: [{ fieldId: 'brand', values: ['Clemente Jacques'], source: 'chat', note: null }],
      }),
      TEST_BRANDS,
    );
    expect(state.meta.brand).toBeUndefined();
    expect(state.values.brand).toBeUndefined();
    expect(rejected).toEqual(['brand']);
    expect(unknownBrands).toEqual(['Clemente Jacques']);
  });

  it('does not send a made-up code to the admin', () => {
    expect(brandTurn('99').unknownBrands).toEqual([]);
  });

  it('lists brands with their other names in the instructions', () => {
    const text = intakeInstructions(sell, '2026-11-05', 'Lucia', TEST_BRANDS);
    expect(text).toContain('- 01 LC · La Costeña (Costeña, La Costeña USA)');
  });
});

describe('intakeInstructions', () => {
  it('lists the catalog, and the fields once the type is known', () => {
    const base = intakeInstructions(emptyIntakeState(), '2026-11-05', 'Lucia', TEST_BRANDS);
    expect(base).toContain('- event: Event, sponsorship or trade show');
    expect(base).not.toContain('Form fields');
    const withType = intakeInstructions(
      { ...emptyIntakeState(), workType: 'event' },
      '2026-11-05',
      'Lucia',
      TEST_BRANDS,
    );
    expect(withType).toContain('- event_name (text, required): Event name');
    expect(withType).toContain('Today is 2026-11-05');
  });
});

describe('summarizeIntake', () => {
  it('counts answers, AI suggestions and missing required questions', () => {
    const s = summarizeIntake({
      workType: 'brand',
      mode: 'new',
      values: { title: 'Brand book', language: 'English' },
      meta: { title: { source: 'ai' }, language: { source: 'chat' } },
    });
    expect(s).toMatchObject({ answered: 2, suggestions: 1 });
    expect(s!.missing).toBeGreaterThan(0);
  });
});

describe('formatReply', () => {
  it('puts each numbered question on its own line', () => {
    expect(formatReply('Got it. 1. Which SKUs? 2. What objective? 3. Who approves?')).toBe(
      'Got it.\n1. Which SKUs?\n2. What objective?\n3. Who approves?',
    );
    expect(formatReply('Got it.\n1. Which SKUs?\n2. Who approves?')).toBe(
      'Got it.\n1. Which SKUs?\n2. Who approves?',
    );
    expect(formatReply('We need 2 assets by Friday.')).toBe('We need 2 assets by Friday.');
    expect(formatReply('Thanks. 1) Which SKUs? 2) Who approves?')).toBe(
      'Thanks.\n1. Which SKUs?\n2. Who approves?',
    );
  });
});

describe('chatTitle', () => {
  it('uses the title, then the work type, then the first message', () => {
    const base = emptyIntakeState();
    expect(chatTitle({ ...base, values: { title: 'Pizza Expo banner' } }, 'hi')).toBe(
      'Pizza Expo banner',
    );
    expect(chatTitle({ ...base, workType: 'event' }, 'hi')).toBe(
      'Event, sponsorship or trade show',
    );
    expect(chatTitle(base, '  we need   something for the booth  ')).toBe(
      'we need something for the booth',
    );
    expect(chatTitle(base, 'x'.repeat(80))).toHaveLength(58);
  });
});
