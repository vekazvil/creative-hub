/**
 * Brands live in the `brands` and `brand_aliases` tables; the app loads them and passes
 * the list in. This module only holds the pure logic (labels, matching, search).
 */
export interface Brand {
  /** Two-digit code used in project numbers, e.g. "01". */
  code: string;
  /** Short code, e.g. "LC". */
  short?: string;
  name: string;
  /** Confirmed other names that lead to this brand (sub-brands, spellings, old names). */
  aliases: string[];
}

export function brandLabel(b: Brand): string {
  return `${b.code}${b.short ? ` ${b.short}` : ''} · ${b.name}`;
}

/** "La Costeña®" → "la costena". Used to store and compare aliases. */
export function normalizeBrandText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findBrand(brands: readonly Brand[], code: string): Brand | undefined {
  return brands.find((b) => b.code === code);
}

export interface BrandMatch {
  brand: Brand;
  /** The alias that matched, when it was not the code, short code or name. */
  via?: string;
}

/**
 * Resolves what someone typed or said ("La Costena", "LC", "01", "Costeña") to one brand.
 * Exact match on a normalized name only; anything else is unknown.
 */
export function matchBrand(brands: readonly Brand[], text: string): BrandMatch | undefined {
  const q = normalizeBrandText(text);
  if (!q) return undefined;
  for (const b of brands) {
    if ([b.code, b.short ?? '', b.name].some((n) => normalizeBrandText(n) === q))
      return { brand: b };
  }
  for (const b of brands) {
    const via = b.aliases.find((a) => normalizeBrandText(a) === q);
    if (via) return { brand: b, via };
  }
  // The label as shown in lists: "18 CT · Chocomilk", "18 CT", "18 Chocomilk".
  const code = /^(\d{2})\s(.+)$/.exec(q);
  const b = code && findBrand(brands, code[1]!);
  if (b) {
    const rest = code[2]!;
    const short = normalizeBrandText(b.short ?? '');
    const name = normalizeBrandText(b.name);
    if ([short, name, `${short} ${name}`.trim()].includes(rest)) return { brand: b };
  }
  return undefined;
}

/**
 * Brand search for the picker. Prefix matches rank above matches inside a name;
 * a hit on an alias says which alias it was.
 */
export function searchBrands(brands: readonly Brand[], query: string): BrandMatch[] {
  const q = normalizeBrandText(query);
  if (!q) return brands.map((brand) => ({ brand }));
  const scored: { m: BrandMatch; score: number; i: number }[] = [];
  brands.forEach((b, i) => {
    const own = [b.code, b.short ?? '', b.name].map(normalizeBrandText);
    const ownScore = Math.max(...own.map((n) => score(n, q)));
    let best: BrandMatch = { brand: b };
    let bestScore = ownScore;
    for (const a of b.aliases) {
      const n = normalizeBrandText(a);
      if (own.some((o) => o.includes(n))) continue; // "Costeña" adds nothing next to "La Costeña"
      const s = score(n, q) - 0.5; // own names win a tie
      if (s > bestScore) {
        bestScore = s;
        best = { brand: b, via: a };
      }
    }
    if (bestScore > 0) scored.push({ m: best, score: bestScore, i });
  });
  return scored.sort((x, y) => y.score - x.score || x.i - y.i).map((s) => s.m);
}

function score(name: string, q: string): number {
  if (!name) return 0;
  if (name === q) return 4;
  if (name.startsWith(q)) return 3;
  if (name.split(' ').some((w) => w.startsWith(q))) return 2;
  if (name.includes(q)) return 1;
  return 0;
}
