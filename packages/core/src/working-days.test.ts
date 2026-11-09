import { describe, expect, it } from 'vitest';

import {
  holidays,
  isWorkingDay,
  noticeCheck,
  todayInTexas,
  workingDaysBetween,
} from './working-days';

describe('holidays', () => {
  it('computes 2026 holidays, including observed days', () => {
    const h = holidays(2026);
    expect(h.has('2026-01-01')).toBe(true);
    expect(h.has('2026-01-19')).toBe(true); // MLK
    expect(h.has('2026-05-25')).toBe(true); // Memorial Day
    expect(h.has('2026-07-03')).toBe(true); // July 4 is a Saturday → Friday
    expect(h.has('2026-11-26')).toBe(true); // Thanksgiving
    expect(h.has('2026-11-27')).toBe(true); // day after
    expect(h.has('2026-12-25')).toBe(true);
  });
  it('moves a Sunday holiday to Monday', () => {
    expect(holidays(2027).has('2027-07-05')).toBe(true); // July 4, 2027 is a Sunday
  });
});

describe('workingDaysBetween', () => {
  it('skips weekends', () => {
    // Thu Nov 5 → Thu Nov 12, 2026: Fri, Mon, Tue, Wed, Thu
    expect(workingDaysBetween('2026-11-05', '2026-11-12')).toBe(5);
  });
  it('skips Thanksgiving and the day after', () => {
    // Mon Nov 23 → Mon Nov 30: Tue, Wed, Mon
    expect(workingDaysBetween('2026-11-23', '2026-11-30')).toBe(3);
  });
  it('is 0 for the same day or a past date', () => {
    expect(workingDaysBetween('2026-11-05', '2026-11-05')).toBe(0);
    expect(workingDaysBetween('2026-11-05', '2026-11-01')).toBe(0);
  });
  it('counts to the deadline inclusive', () => {
    expect(isWorkingDay('2026-11-06')).toBe(true);
    expect(workingDaysBetween('2026-11-05', '2026-11-06')).toBe(1);
  });
});

describe('noticeCheck', () => {
  it('flags under 5 working days as urgent, using the earliest date', () => {
    const r = noticeCheck(['2026-11-20', '2026-11-11'], '2026-11-05');
    expect(r).toEqual({ workingDays: 4, deadline: '2026-11-11', urgent: true });
  });
  it('treats 5 or more working days as normal', () => {
    expect(noticeCheck(['2026-11-12'], '2026-11-05')?.urgent).toBe(false);
  });
  it('returns null without valid dates', () => {
    expect(noticeCheck([undefined, ''], '2026-11-05')).toBeNull();
  });
});

describe('todayInTexas', () => {
  it('uses the Texas date, not UTC', () => {
    // 03:00 UTC on Nov 6 is still Nov 5 in Texas (UTC−6)
    expect(todayInTexas(new Date('2026-11-06T03:00:00Z'))).toBe('2026-11-05');
  });
});
