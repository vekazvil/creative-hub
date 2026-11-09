import {
  APPROVAL_DECISIONS,
  BRAND_ALIAS_STATUSES,
  CHAT_ROLES,
  OPERATION_STATUSES,
  OUTBOX_STATUSES,
  PRIORITIES,
  REQUEST_MODES,
  REQUEST_STATUSES,
} from '@creative-hub/core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const requestStatus = pgEnum('request_status', REQUEST_STATUSES);
export const requestMode = pgEnum('request_mode', REQUEST_MODES);
export const priority = pgEnum('priority', PRIORITIES);
export const approvalDecision = pgEnum('approval_decision', APPROVAL_DECISIONS);
export const outboxStatus = pgEnum('outbox_status', OUTBOX_STATUSES);
export const operationStatus = pgEnum('operation_status', OPERATION_STATUSES);
export const brandAliasStatus = pgEnum('brand_alias_status', BRAND_ALIAS_STATUSES);
export const chatRole = pgEnum('chat_role', CHAT_ROLES);
