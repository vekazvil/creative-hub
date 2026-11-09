// Closed value sets shared by the database (pg enums) and domain logic.
// Adding a value here needs a new DB migration.

/** Lifecycle of a request. Transitions are defined in task 1.12. */
export const REQUEST_STATUSES = [
  'draft', // being filled in, nothing sent
  'submitted', // sent by the requester, checks passed
  'pending_approval', // urgent: waits for PM / creative manager
  'approved', // ready for creation
  'rejected', // approval refused
  'creating', // worker is creating number, Monday, Drive, Slack, email
  'created', // every creation step succeeded
  'failed', // a creation step gave up after retries
  'cancelled', // withdrawn before creation
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** New work, or an update of something that exists. Any work type can be an update. */
export const REQUEST_MODES = ['new', 'update'] as const;
export type RequestMode = (typeof REQUEST_MODES)[number];

/** Priority as picked in the form ("Bomberazo" = drop everything). */
export const PRIORITIES = ['normal', 'urgent', 'bomberazo'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const APPROVAL_DECISIONS = ['approved', 'rejected'] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const OUTBOX_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OPERATION_STATUSES = ['started', 'succeeded', 'failed'] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export const BRAND_ALIAS_STATUSES = ['confirmed', 'pending'] as const;
export type BrandAliasStatus = (typeof BRAND_ALIAS_STATUSES)[number];

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];
