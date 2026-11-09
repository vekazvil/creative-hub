// Texas working-day calendar for the urgency rule.
// Weekends and these holidays are not working days (observed on Fri/Mon when they
// fall on a weekend): New Year's Day, MLK Day, Presidents' Day, Memorial Day,
// Juneteenth, Independence Day, Labor Day, Thanksgiving and the day after, Christmas.
// To confirm with the client: whether Veterans Day, Columbus Day, Dec 24/26 count.

export const TEXAS_TIME_ZONE = 'America/Chicago';

/** Notice under this many working days needs PM / creative manager approval. */
export const URGENT_WORKING_DAYS = 5;

/** A calendar date as "YYYY-MM-DD". */
export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number): IsoDate => `${y}-${pad(m)}-${pad(d)}`;

function utc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}
const toIso = (d: Date): IsoDate => iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());

/** n-th weekday (0 = Sunday) of a month; n = -1 for the last one. */
function nthWeekday(year: number, month: number, weekday: number, n: number): IsoDate {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
    return iso(year, month, day);
  }
  const lastDay = new Date(Date.UTC(year, month, 0));
  const back = (lastDay.getUTCDay() - weekday + 7) % 7;
  return iso(year, month, lastDay.getUTCDate() - back);
}

function observed(date: IsoDate): IsoDate {
  const d = utc(date);
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return toIso(d);
}

const cache = new Map<number, Set<IsoDate>>();

export function holidays(year: number): Set<IsoDate> {
  const hit = cache.get(year);
  if (hit) return hit;
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  const dayAfter = utc(thanksgiving);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const set = new Set<IsoDate>([
    observed(iso(year, 1, 1)),
    nthWeekday(year, 1, 1, 3), // MLK Day
    nthWeekday(year, 2, 1, 3), // Presidents' Day
    nthWeekday(year, 5, 1, -1), // Memorial Day
    observed(iso(year, 6, 19)),
    observed(iso(year, 7, 4)),
    nthWeekday(year, 9, 1, 1), // Labor Day
    thanksgiving,
    toIso(dayAfter),
    observed(iso(year, 12, 25)),
  ]);
  cache.set(year, set);
  return set;
}

export function isWorkingDay(date: IsoDate): boolean {
  const d = utc(date);
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !holidays(d.getUTCFullYear()).has(date);
}

/** Today's date in Texas. */
export function todayInTexas(now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TEXAS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Working days of notice: working days after `from` up to and including `to`.
 * Same day or a past date → 0.
 */
export function workingDaysBetween(from: IsoDate, to: IsoDate): number {
  const start = utc(from);
  const end = utc(to);
  let count = 0;
  for (const d = new Date(start); d < end;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(toIso(d))) count++;
  }
  return count;
}

export interface NoticeCheck {
  /** Working days until the earliest deadline. */
  workingDays: number;
  /** The deadline the notice is counted to. */
  deadline: IsoDate;
  /** Under the normal notice: needs PM / creative manager approval. */
  urgent: boolean;
}

/** Notice for a request, counted to its earliest deadline. Null without dates. */
export function noticeCheck(
  deadlines: (IsoDate | undefined)[],
  today: IsoDate = todayInTexas(),
): NoticeCheck | null {
  const dates = deadlines.filter((d): d is IsoDate => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const deadline = dates[0];
  if (!deadline) return null;
  const workingDays = workingDaysBetween(today, deadline);
  return { workingDays, deadline, urgent: workingDays < URGENT_WORKING_DAYS };
}
