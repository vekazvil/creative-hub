import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';

/**
 * People a requester can pick as the approver of a request.
 * Removing someone only turns them off (`active = false`), so past requests still show their name.
 */
export const approvers = pgTable('approvers', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  /** Lowercase. Stored in the request's approver answer. */
  email: text().notNull().unique(),
  /** Role or team, e.g. "Brand manager, La Costeña". */
  title: text(),
  active: boolean().notNull().default(true),
  createdByEmail: text().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
