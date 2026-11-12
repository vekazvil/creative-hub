import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { createdAt } from './_shared';

/**
 * A shareable link to the request form (/l/<token>) that works without signing in.
 * Requests sent through it belong to the person who made the link.
 */
export const publicLinks = pgTable(
  'public_links',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** The unguessable part of the URL. */
    token: text().notNull().unique(),
    /** What the link is for, e.g. "H-E-B team". Only the owner sees it. */
    label: text(),
    createdByEmail: text().notNull(),
    /** Set when the owner turns the link off; it then stops opening the form. */
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('public_links_owner_idx').on(t.createdByEmail, t.createdAt)],
);
