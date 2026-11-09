import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';
import { brandAliasStatus } from './enums';

/** Brands used in project numbers. Imported from the counter Sheet (columns B, C, D). */
export const brands = pgTable('brands', {
  /** Two-digit number used in project numbers, e.g. "01". */
  code: text().primaryKey(),
  /** Short code, e.g. "LC". */
  short: text(),
  name: text().notNull(),
  /** Brand folder on the shared drive, once Drive access exists. */
  driveFolderId: text(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Other names that lead to a brand: sub-brands, spellings, old names.
 * A new name nobody has linked yet is `pending` and waits for an admin; until then it may
 * point at a related brand, or at none.
 */
export const brandAliases = pgTable(
  'brand_aliases',
  {
    id: uuid().primaryKey().defaultRandom(),
    alias: text().notNull(),
    /** `normalizeBrandText(alias)`; one row per name. */
    normalized: text().notNull().unique(),
    brandCode: text().references(() => brands.code, { onDelete: 'cascade' }),
    status: brandAliasStatus().notNull().default('confirmed'),
    /** Who first used the name, for pending aliases. */
    suggestedBy: text(),
    createdAt: createdAt(),
  },
  (t) => [index('brand_aliases_brand_code_idx').on(t.brandCode)],
);
