import 'server-only';

import {
  DEFAULT_CAMPAIGN_PIECES,
  getWorkType,
  type RequestFormData,
  type RequestMode,
} from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { and, count, desc, eq, gte, inArray, isNull, lt, lte, ne, or, type SQL } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { getDb } from '../db';
import { addDays, PAGE_SIZE, TABS, type RequestFilters, type TabId } from './filters';

const { requests } = schema;

const valuesSchema = z.record(
  z.string(),
  z.union([z.string().max(20_000), z.array(z.string().max(2_000)).max(100)]),
);

export const formDataSchema = z.object({
  values: valuesSchema,
  pieces: z
    .array(z.object({ type: z.string(), values: valuesSchema }))
    .max(20)
    .optional(),
  notes: z.string().max(20_000).optional(),
  meta: z
    .record(
      z.string(),
      z.object({ source: z.enum(['chat', 'ai']), note: z.string().max(500).optional() }),
    )
    .optional(),
});

export function emptyFormData(typeId: string, notes?: string): RequestFormData {
  return {
    values: {},
    ...(typeId === 'campaign' && {
      pieces: DEFAULT_CAMPAIGN_PIECES.map((type) => ({ type, values: {} })),
    }),
    ...(notes && { notes }),
  };
}

export function readFormData(draft: unknown): RequestFormData {
  const parsed = formDataSchema.safeParse(draft);
  return parsed.success ? (parsed.data as RequestFormData) : { values: {} };
}

/** A request the signed-in user may see: they asked for it or sent it. */
export async function getOwnRequest(id: string, email: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const [row] = await getDb()
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.id, id),
        or(eq(requests.requesterEmail, email), eq(requests.submittedByEmail, email)),
      ),
    )
    .limit(1);
  if (!row) notFound();
  const type = getWorkType(row.workType);
  if (!type) notFound();
  return { request: row, type, mode: row.mode as RequestMode, data: readFormData(row.draft) };
}

export async function listOwnRequests(email: string) {
  return getDb()
    .select({
      id: requests.id,
      title: requests.title,
      workType: requests.workType,
      mode: requests.mode,
      status: requests.status,
      brandCode: requests.brandCode,
      updatedAt: requests.updatedAt,
      submittedAt: requests.submittedAt,
      firstDraftOn: requests.firstDraftOn,
      finalFilesOn: requests.finalFilesOn,
    })
    .from(requests)
    .where(or(eq(requests.requesterEmail, email), eq(requests.submittedByEmail, email)))
    .orderBy(desc(requests.updatedAt))
    .limit(100);
}

/** Conditions for the filters menu: work types, brands and the final files date. */
function filterConditions(f: RequestFilters, today: string): SQL[] {
  const c: SQL[] = [];
  if (f.types.length) c.push(inArray(requests.workType, f.types));
  if (f.brands.length) c.push(inArray(requests.brandCode, f.brands));
  if (f.due === 'none') c.push(isNull(requests.finalFilesOn));
  else if (f.due === 'overdue') c.push(lt(requests.finalFilesOn, today));
  else if (f.due) {
    c.push(gte(requests.finalFilesOn, today));
    c.push(lte(requests.finalFilesOn, addDays(today, f.due === 'week' ? 7 : 30)));
  }
  return c;
}

/**
 * One page of "My requests", filtered and paged in the database, with the count per tab
 * (under the same filters) and the types and brands the filter menu can offer.
 */
export async function queryOwnRequests(
  email: string,
  opts: { tab: TabId; filters: RequestFilters; page: number; today: string },
) {
  const db = getDb();
  const mine = and(
    or(eq(requests.requesterEmail, email), eq(requests.submittedByEmail, email)),
    ne(requests.status, 'cancelled'),
  )!;
  const filtered = and(mine, ...filterConditions(opts.filters, opts.today))!;
  const statuses = TABS.find((t) => t.id === opts.tab)!.statuses;
  const inTab = statuses ? and(filtered, inArray(requests.status, [...statuses]))! : filtered;

  const [byStatus, types, brands] = await Promise.all([
    db
      .select({ status: requests.status, n: count() })
      .from(requests)
      .where(filtered)
      .groupBy(requests.status),
    db.selectDistinct({ id: requests.workType }).from(requests).where(mine),
    db.selectDistinct({ id: requests.brandCode }).from(requests).where(mine),
  ]);

  const tabCounts = Object.fromEntries(
    TABS.map((t) => [
      t.id,
      byStatus
        .filter((r) => !t.statuses || (t.statuses as readonly string[]).includes(r.status))
        .reduce((n, r) => n + r.n, 0),
    ]),
  ) as Record<TabId, number>;
  const total = tabCounts[opts.tab];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(opts.page, pages);

  const rows = await db
    .select({
      id: requests.id,
      title: requests.title,
      workType: requests.workType,
      mode: requests.mode,
      status: requests.status,
      brandCode: requests.brandCode,
      updatedAt: requests.updatedAt,
      submittedAt: requests.submittedAt,
      firstDraftOn: requests.firstDraftOn,
      finalFilesOn: requests.finalFilesOn,
    })
    .from(requests)
    .where(inTab)
    .orderBy(desc(requests.updatedAt), desc(requests.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return {
    rows,
    total,
    page,
    pages,
    tabCounts,
    typeIds: types.map((t) => t.id),
    brandCodes: brands.map((b) => b.id).filter((c): c is string => !!c),
  };
}
