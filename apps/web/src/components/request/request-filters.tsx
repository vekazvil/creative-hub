'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  activeFilterCount,
  DUE_OPTIONS,
  filtersQuery,
  type DueFilter,
  type RequestFilters,
} from '@/lib/requests/filters';
import { cn } from '@/lib/utils';

type Option = { id: string; label: string };

const item = 'rounded-lg py-1.5 pr-8 pl-2.5 text-[14px] cursor-pointer';
const label = 'px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase';

/** "Filters" button with a menu: work type, brand and final files date. */
export function RequestFilterMenu({
  tab,
  filters,
  types,
  brands,
}: {
  tab: string;
  filters: RequestFilters;
  types: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const count = activeFilterCount(filters);

  const go = (next: RequestFilters) =>
    start(() => router.replace(`/requests${filtersQuery(tab, next)}`, { scroll: false }));
  const toggle = (key: 'types' | 'brands', id: string) => {
    const set = new Set(filters[key]);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    go({ ...filters, [key]: [...set] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
          count
            ? 'bg-foreground text-background'
            : 'bg-black/[0.05] text-foreground hover:bg-black/[0.08] dark:bg-white/10',
          pending && 'opacity-70',
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters
        {count > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-foreground tabular-nums">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[70vh] w-64 rounded-2xl border-0 p-1.5 shadow-(--shadow-float) ring-1 ring-black/5 dark:ring-white/10"
      >
        <DropdownMenuLabel className={label}>Type</DropdownMenuLabel>
        {types.length === 0 && (
          <p className="px-2.5 pb-1.5 text-sm text-muted-foreground">No requests yet</p>
        )}
        {types.map((t) => (
          <DropdownMenuCheckboxItem
            key={t.id}
            className={item}
            checked={filters.types.includes(t.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle('types', t.id)}
          >
            {t.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuLabel className={label}>Brand</DropdownMenuLabel>
        {brands.length === 0 && (
          <p className="px-2.5 pb-1.5 text-sm text-muted-foreground">No brand set yet</p>
        )}
        {brands.map((b) => (
          <DropdownMenuCheckboxItem
            key={b.id}
            className={item}
            checked={filters.brands.includes(b.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle('brands', b.id)}
          >
            {b.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuLabel className={label}>Final files</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.due ?? 'any'}
          onValueChange={(v) => go({ ...filters, due: v === 'any' ? null : (v as DueFilter) })}
        >
          <DropdownMenuRadioItem value="any" className={item} onSelect={(e) => e.preventDefault()}>
            Any time
          </DropdownMenuRadioItem>
          {DUE_OPTIONS.map((o) => (
            <DropdownMenuRadioItem
              key={o.id}
              value={o.id}
              className={item}
              onSelect={(e) => e.preventDefault()}
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {count > 0 && (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <button
              type="button"
              onClick={() => go({ types: [], brands: [], due: null })}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-[14px] font-medium text-primary hover:bg-accent"
            >
              Clear all filters
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The filters in use, as chips that each remove themselves. */
export function ActiveFilters({
  tab,
  filters,
  types,
  brands,
}: {
  tab: string;
  filters: RequestFilters;
  types: Option[];
  brands: Option[];
}) {
  if (activeFilterCount(filters) === 0) return null;
  const href = (next: RequestFilters) => `/requests${filtersQuery(tab, next)}`;
  const name = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.label ?? id;
  const chips = [
    ...filters.types.map((id) => ({
      key: `t-${id}`,
      text: name(types, id),
      href: href({ ...filters, types: filters.types.filter((x) => x !== id) }),
    })),
    ...filters.brands.map((id) => ({
      key: `b-${id}`,
      text: name(brands, id),
      href: href({ ...filters, brands: filters.brands.filter((x) => x !== id) }),
    })),
    ...(filters.due
      ? [
          {
            key: 'due',
            text: `Final files: ${DUE_OPTIONS.find((o) => o.id === filters.due)!.label.toLowerCase()}`,
            href: href({ ...filters, due: null }),
          },
        ]
      : []),
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          replace
          className="group inline-flex h-8 items-center gap-1.5 rounded-full bg-card pr-2 pl-3 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-colors hover:bg-muted"
        >
          {c.text}
          <X
            className="size-3.5 text-muted-foreground group-hover:text-foreground"
            aria-label="Remove"
          />
        </Link>
      ))}
      <Link
        href={href({ types: [], brands: [], due: null })}
        scroll={false}
        replace
        className="px-2 text-[13px] font-medium text-primary hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
