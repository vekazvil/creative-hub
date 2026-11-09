import { describe, expect, it } from 'vitest';

import { addDays, filtersQuery, parseFilters, parsePage, parseTab } from './filters';

describe('request filters', () => {
  it('reads filters from the URL and ignores unknown values', () => {
    expect(parseFilters({ type: 'event,sell', brand: '01', due: 'week' })).toEqual({
      types: ['event', 'sell'],
      brands: ['01'],
      due: 'week',
    });
    expect(parseFilters({ due: 'someday' }).due).toBeNull();
  });

  it('writes the query back without empty parts', () => {
    expect(filtersQuery('all', { types: [], brands: [], due: null })).toBe('');
    expect(filtersQuery('active', { types: ['event'], brands: [], due: 'month' })).toBe(
      '?tab=active&type=event&due=month',
    );
    expect(filtersQuery('drafts', { types: [], brands: ['01'], due: null }, 3)).toBe(
      '?tab=drafts&brand=01&page=3',
    );
  });
});

describe('tab and page', () => {
  it('falls back to safe values', () => {
    expect(parseTab('active')).toBe('active');
    expect(parseTab('nope')).toBe('all');
    expect(parsePage('3')).toBe(3);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});

describe('addDays', () => {
  it('moves a date across month ends', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(addDays('2026-11-06', 30)).toBe('2026-12-06');
  });
});
