import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_shared';
import { operationStatus, outboxStatus } from './enums';
import { projects } from './projects';
import { requests } from './requests';

/**
 * Jobs waiting for the worker. Written in the same transaction as the state change,
 * so a job is never lost and never sent without its state.
 */
export const outbox = pgTable(
  'outbox',
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid().references(() => requests.id, { onDelete: 'cascade' }),
    /** Job kind, e.g. "project.create". */
    kind: text().notNull(),
    payload: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: outboxStatus().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastError: text(),
    createdAt: createdAt(),
    processedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('outbox_pending_idx').on(t.status, t.nextAttemptAt)],
);

/**
 * Every external call and the ID it returned. The (request_id, operation) key is written
 * before the call, so a retried step finds it and never creates a duplicate.
 */
export const operations = pgTable(
  'operations',
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    /** Step name, e.g. "monday.item", "drive.folder", "slack.channel", "email.requester". */
    operation: text().notNull(),
    status: operationStatus().notNull().default('started'),
    /** ID returned by the external service (Monday item ID, Drive folder ID, …). */
    externalId: text(),
    response: jsonb().$type<Record<string, unknown>>(),
    error: text(),
    attempts: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [unique('operations_request_operation_uq').on(t.requestId, t.operation)],
);

/**
 * Business log: who, when, which transition, brief version, error, AI cost.
 * Append-only — a trigger rejects UPDATE and DELETE.
 */
export const events = pgTable(
  'events',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    // No ON DELETE action: events are append-only, so a referenced request or project
    // cannot be deleted (nothing is deleted in Creative Hub anyway).
    requestId: uuid().references(() => requests.id),
    projectId: uuid().references(() => projects.id),
    /** Null for system actions (worker). */
    actorEmail: text(),
    /** Event type, e.g. "request.transition", "operation.failed", "ai.call". */
    type: text().notNull(),
    fromStatus: text(),
    toStatus: text(),
    briefVersion: integer(),
    data: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    error: text(),
    aiCostUsd: numeric({ precision: 12, scale: 6 }),
    createdAt: createdAt(),
  },
  (t) => [
    index('events_request_id_idx').on(t.requestId, t.createdAt),
    index('events_type_idx').on(t.type, t.createdAt),
  ],
);
