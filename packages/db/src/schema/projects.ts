import { date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';
import { requests } from './requests';

/**
 * One row per approved request (or per migrated legacy project).
 * `number` is the display number, e.g. "01-.279"; `sequence` is the counter value.
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Null for projects migrated from before Creative Hub. */
    requestId: uuid()
      .unique()
      .references((): AnyPgColumn => requests.id, { onDelete: 'set null' }),
    brandCode: text().notNull(),
    sequence: integer().notNull(),
    /**
     * Unique display number. Migration of legacy numbers (duplicate 275,
     * "01-." prefix) follows the gate 3 decision.
     */
    number: text().notNull().unique(),
    name: text().notNull(),
    workType: text().notNull(),
    ownerEmail: text(),
    startOn: date(),
    dueOn: date(),
    /** For an update: the earlier project it builds on. */
    parentProjectId: uuid().references((): AnyPgColumn => projects.id, { onDelete: 'set null' }),
    migratedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('projects_brand_code_idx').on(t.brandCode)],
);

/** One counter per brand. Changed only under a row lock (task 1.10). */
export const counters = pgTable('counters', {
  brandCode: text().primaryKey(),
  /** Prefix of the display number, e.g. "01-." */
  prefix: text().notNull(),
  lastValue: integer().notNull().default(0),
  updatedAt: updatedAt(),
});
