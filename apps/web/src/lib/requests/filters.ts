/**
 * Filters on "My requests", kept in the URL (?tab=active&type=event,sell&brand=01&due=week)
 * so a filtered list can be shared or bookmarked. Shared by the page (server) and the
 * filter menu (client).
 */

/** Status tabs. Cancelled requests are never listed. */
export const TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'drafts', label: 'Drafts', statuses: ['draft'] },
  {
    id: 'active',
    label: 'In progress',
    statuses: ['submitted', 'pending_approval', 'approved', 'creating', 'created', 'failed'],
  },
  { id: 'closed', label: 'Closed', statuses: ['rejected'] },
] as const satisfies readonly { id: string; label: string; statuses: readonly string[] | null }[];
export type TabId = (typeof TABS)[number]['id'];

export const PAGE_SIZE = 20;

export function parseTab(v: unknown): TabId {
  return TABS.some((t) => t.id === v) ? (v as TabId) : 'all';
}

export function parsePage(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : 1;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

export const DUE_OPTIONS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'week', label: 'Next 7 days' },
  { id: 'month', label: 'Next 30 days' },
  { id: 'none', label: 'No date yet' },
] as const;
export type DueFilter = (typeof DUE_OPTIONS)[number]['id'];

export interface RequestFilters {
  types: string[];
  brands: string[];
  due: DueFilter | null;
}

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(',') : (v ?? ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

export function parseFilters(params: Params): RequestFilters {
  const due = typeof params.due === 'string' ? params.due : '';
  return {
    types: list(params.type),
    brands: list(params.brand),
    due: DUE_OPTIONS.some((o) => o.id === due) ? (due as DueFilter) : null,
  };
}

export function activeFilterCount(f: RequestFilters): number {
  return f.types.length + f.brands.length + (f.due ? 1 : 0);
}

/** The query string for a tab, filters and page; empty parts are left out. */
export function filtersQuery(tab: string, f: RequestFilters, page = 1): string {
  const q = new URLSearchParams();
  if (tab !== 'all') q.set('tab', tab);
  if (f.types.length) q.set('type', f.types.join(','));
  if (f.brands.length) q.set('brand', f.brands.join(','));
  if (f.due) q.set('due', f.due);
  if (page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
