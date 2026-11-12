import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';
import { approvalDecision, priority, requestMode, requestStatus } from './enums';
import { projects } from './projects';
import { publicLinks } from './public-links';

/**
 * One row per request. Created before any external write.
 * People are referenced by email until the `people` table exists (task 4.2).
 */
export const requests = pgTable(
  'requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Person the request is for. */
    requesterEmail: text().notNull(),
    /** Person who filled it in; differs from requester when a PM sends on someone's behalf. */
    submittedByEmail: text().notNull(),
    /** Work type code, e.g. SELL, EVENT, CAMPAIGN. Becomes an FK when `work_types` exists. */
    workType: text().notNull(),
    mode: requestMode().notNull().default('new'),
    status: requestStatus().notNull().default('draft'),
    title: text(),
    /** Brand code, e.g. "01" for La Costeña. Becomes an FK when `brands` exists (task 2.5). */
    brandCode: text(),
    priority: priority().notNull().default('normal'),
    firstDraftOn: date(),
    finalFilesOn: date(),
    /** For an update: the project being updated. */
    relatedProjectId: uuid().references(() => projects.id, { onDelete: 'set null' }),
    /** The public link it was sent through, if any. Its owner sees the request. */
    publicLinkId: uuid().references(() => publicLinks.id, { onDelete: 'set null' }),
    currentBriefVersion: integer().notNull().default(0),
    /** Answers while the request is a draft; autosaved. Becomes a brief version on submit. */
    draft: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    submittedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // "My requests" lists by requester or sender, newest first.
    index('requests_requester_recent_idx').on(t.requesterEmail, t.updatedAt),
    index('requests_submitter_recent_idx').on(t.submittedByEmail, t.updatedAt),
    index('requests_status_idx').on(t.status),
    index('requests_public_link_idx').on(t.publicLinkId),
  ],
);

/**
 * Every version of the brief, as JSON. Never updated or deleted.
 * `data` holds the form answers; `fieldMeta` holds per-field source
 * (chat, ai, brand, earlier, file, rule, you, missing) and confirmations.
 */
export const briefVersions = pgTable(
  'brief_versions',
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    /** Version of the work-type form the answers were given against. */
    formVersion: integer().notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull(),
    fieldMeta: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdByEmail: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique('brief_versions_request_version_uq').on(t.requestId, t.version)],
);

/** Who approved which brief version, and when. No row, no creation for urgent requests. */
export const approvals = pgTable(
  'approvals',
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    briefVersion: integer().notNull(),
    decision: approvalDecision().notNull(),
    approverEmail: text().notNull(),
    /** True when the approval was needed because of the urgency rule (< 5 Texas working days). */
    urgent: boolean().notNull().default(false),
    comment: text(),
    decidedAt: createdAt(),
  },
  (t) => [index('approvals_request_id_idx').on(t.requestId)],
);
