import { describe, expect, it } from 'vitest';

import { TEST_BRANDS } from '../testing/brands';
import { applyPrefill, prefillInstructions, uncheckedAnswers } from './prefill';
import type { RequestFormData } from './types';
import { getWorkType } from './work-types';

const event = getWorkType('event')!;

describe('applyPrefill', () => {
  it('fills valid answers from the notes and marks them', () => {
    const { data, filled } = applyPrefill(
      event,
      'new',
      { values: {}, notes: 'Banner for Pizza Expo' },
      {
        answers: [
          { fieldId: 'event_name', values: ['Pizza Expo'] },
          { fieldId: 'language', values: ['French'] },
          { fieldId: 'first_draft', values: ['next Friday'] },
          { fieldId: 'brand', values: ['99'] },
          { fieldId: 'nope', values: ['x'] },
        ],
      },
      TEST_BRANDS,
    );
    expect(filled).toEqual(['event_name']);
    expect(data.values).toEqual({ event_name: 'Pizza Expo' });
    expect(data.meta).toEqual({ event_name: { source: 'notes' } });
    expect(data.notes).toBe('Banner for Pizza Expo');
  });

  it('never overwrites what the requester already answered', () => {
    const start: RequestFormData = { values: { event_name: 'Mine' } };
    const { data, filled } = applyPrefill(
      event,
      'new',
      start,
      { answers: [{ fieldId: 'event_name', values: ['Pizza Expo'] }] },
      TEST_BRANDS,
    );
    expect(filled).toEqual([]);
    expect(data).toBe(start);
  });

  it('lists the fields for the model', () => {
    const text = prefillInstructions({
      type: event,
      mode: 'new',
      data: { values: {} },
      today: '2026-11-16',
      brands: TEST_BRANDS,
    });
    expect(text).toContain('- event_name (');
    expect(text).toContain('Today is 2026-11-16');
  });
});

describe('uncheckedAnswers', () => {
  it('counts answers from the notes and suggestions, not from the chat or edited ones', () => {
    expect(
      uncheckedAnswers({
        values: { a: 'x', b: 'y', c: 'z' },
        meta: {
          a: { source: 'notes' },
          b: { source: 'ai' },
          c: { source: 'chat' },
          d: { source: 'notes' },
        },
      }),
    ).toEqual(['a', 'b']);
  });
});
