import { formatDate, getWorkType, todayInTexas } from '@creative-hub/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ActiveFilters, RequestFilterMenu } from '@/components/request/request-filters';
import { StatusBadge } from '@/components/request/status-badge';
import { getBrands } from '@/lib/brands';
import { queryOwnRequests } from '@/lib/requests/data';
import {
  activeFilterCount,
  filtersQuery,
  PAGE_SIZE,
  parseFilters,
  parsePage,
  parseTab,
  TABS,
} from '@/lib/requests/filters';
import { requireSession } from '@/lib/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'My requests' };

const updated = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
/** "Fri, Nov 13, 2026" → "Nov 13" for the table. */
const shortDate = (iso: string) => formatDate(iso).split(', ')[1] ?? iso;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const filters = parseFilters(params);

  // Filtering, counting and paging all happen in the database.
  const [result, brands] = await Promise.all([
    queryOwnRequests(user.email, {
      tab,
      filters,
      page: parsePage(params.page),
      today: todayInTexas(),
    }),
    getBrands(),
  ]);
  const { rows, total, page, pages, tabCounts } = result;
  const current = TABS.find((t) => t.id === tab)!;
  const filtering = activeFilterCount(filters) > 0;
  const hasAny = result.typeIds.length > 0;

  // The filter menu offers only what the requester actually has.
  const typeOptions = result.typeIds
    .map((id) => ({ id, label: getWorkType(id)?.name ?? id }))
    .sort((x, y) => x.label.localeCompare(y.label));
  const brandOptions = result.brandCodes
    .map((id) => ({ id, label: brands.find((b) => b.code === id)?.name ?? id }))
    .sort((x, y) => x.label.localeCompare(y.label));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-[34px] leading-tight font-semibold">My requests</h1>
      <p className="mt-1 text-[17px] text-muted-foreground">
        Drafts and everything you’ve sent, newest first.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Requests by status"
          className="inline-flex rounded-full bg-black/[0.05] p-1 dark:bg-white/10"
        >
          {TABS.map((t) => {
            const count = tabCounts[t.id];
            const active = t.id === tab;
            return (
              <Link
                key={t.id}
                href={`/requests${filtersQuery(t.id, filters)}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm transition-all duration-200',
                  active
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
              </Link>
            );
          })}
        </nav>
        <RequestFilterMenu tab={tab} filters={filters} types={typeOptions} brands={brandOptions} />
      </div>
      <ActiveFilters tab={tab} filters={filters} types={typeOptions} brands={brandOptions} />

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card px-6 py-16 text-center shadow-(--shadow-card)">
          <p className="text-[17px] font-semibold">
            {!hasAny
              ? 'No requests yet'
              : filtering
                ? 'No requests match these filters'
                : `Nothing in ${current.label.toLowerCase()}`}
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {!hasAny
              ? 'Start one with New request at the top.'
              : filtering
                ? 'Try removing a filter.'
                : 'Requests show up here as their status changes.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl bg-card shadow-(--shadow-card)">
          {/* Column labels (wide screens) */}
          <div className="hidden grid-cols-[minmax(0,1fr)_160px_110px_150px_20px] gap-6 border-b border-border px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid">
            <span>Request</span>
            <span>Brand</span>
            <span>Final files</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const type = getWorkType(r.workType);
              const brand = brands.find((b) => b.code === r.brandCode);
              const due = r.finalFilesOn;
              return (
                <li key={r.id}>
                  <Link
                    href={`/requests/${r.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-muted/60 sm:px-6 md:grid-cols-[minmax(0,1fr)_160px_110px_150px_20px] md:gap-6"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="hidden h-10 min-w-16 shrink-0 items-center justify-center rounded-xl bg-secondary px-2 text-[10px] font-semibold tracking-wide text-muted-foreground sm:flex">
                        {type?.code ?? '-'}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'truncate text-[16px] font-medium',
                            !r.title && 'text-muted-foreground',
                          )}
                        >
                          {r.title || `New ${type?.name.toLowerCase() ?? 'request'}`}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {type?.name ?? r.workType}
                          {r.mode === 'update' && ' · update'} · {r.submittedAt ? 'sent' : 'edited'}{' '}
                          {updated.format(r.submittedAt ?? r.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <span className="hidden truncate text-sm md:block">
                      {brand ? brand.name : <span className="text-muted-foreground">-</span>}
                    </span>
                    <span className="hidden text-sm tabular-nums md:block">
                      {due ? shortDate(due) : <span className="text-muted-foreground">-</span>}
                    </span>
                    <span className="justify-self-end md:justify-self-start">
                      <StatusBadge status={r.status} />
                    </span>
                    <ChevronRight
                      className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > 0 && (
        <Pagination
          page={page}
          pages={pages}
          total={total}
          href={(p) => `/requests${filtersQuery(tab, filters, p)}`}
        />
      )}
    </main>
  );
}

/** "21–40 of 57" with previous and next, plus page numbers when there are a few. */
function Pagination({
  page,
  pages,
  total,
  href,
}: {
  page: number;
  pages: number;
  total: number;
  href: (page: number) => string;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  // First, last, and the pages around the current one; gaps become "…".
  const shown = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  const btn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm transition-colors';

  return (
    <nav
      aria-label="Pages"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className={cn(btn, 'hover:bg-black/5')}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className={cn(btn, 'opacity-40')} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
          {shown.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && p - shown[i - 1]! > 1 && <span className="px-1">…</span>}
              <Link
                href={href(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  btn,
                  'tabular-nums',
                  p === page
                    ? 'bg-foreground font-medium text-background'
                    : 'text-foreground hover:bg-black/5',
                )}
              >
                {p}
              </Link>
            </span>
          ))}
          {page < pages ? (
            <Link
              href={href(page + 1)}
              className={cn(btn, 'hover:bg-black/5')}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={cn(btn, 'opacity-40')} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
