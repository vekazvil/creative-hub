import 'server-only';

import { normalizeBrandText, type Brand } from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { cache } from 'react';

import { getDb } from './db';

/** Active brands with their confirmed other names. Once per request. */
export const getBrands = cache(async (): Promise<Brand[]> => {
  const db = getDb();
  const [rows, aliases] = await Promise.all([
    db
      .select()
      .from(schema.brands)
      .where(eq(schema.brands.active, true))
      .orderBy(asc(schema.brands.code)),
    db
      .select({ alias: schema.brandAliases.alias, brandCode: schema.brandAliases.brandCode })
      .from(schema.brandAliases)
      .where(
        and(eq(schema.brandAliases.status, 'confirmed'), isNotNull(schema.brandAliases.brandCode)),
      )
      .orderBy(asc(schema.brandAliases.alias)),
  ]);
  return rows.map((b) => ({
    code: b.code,
    ...(b.short && { short: b.short }),
    name: b.name,
    aliases: aliases.filter((a) => a.brandCode === b.code).map((a) => a.alias),
  }));
});

/**
 * Keeps a brand name nobody has linked yet, so an admin can confirm it later.
 * A name that is already known (in any state) is left as it is.
 */
export async function suggestBrandName(name: string, suggestedBy: string) {
  const normalized = normalizeBrandText(name);
  if (!normalized) return;
  await getDb()
    .insert(schema.brandAliases)
    .values({ alias: name.trim().slice(0, 120), normalized, status: 'pending', suggestedBy })
    .onConflictDoNothing({ target: schema.brandAliases.normalized });
}
