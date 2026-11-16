import 'server-only';

import { createJobRunner } from '@creative-hub/jobs';
import { after } from 'next/server';

import { getDb } from './db';

/** Runs due outbox jobs (Drive folder, Monday item…), at most `max`, within the time budget. */
export function processDueJobs(opts?: { max?: number; budgetMs?: number }) {
  return createJobRunner(getDb()).processDueJobs(opts);
}

/**
 * Starts the queued jobs once the response is sent, so the requester doesn't wait for Monday
 * and Drive. Whatever fails stays in the outbox for /api/jobs/run to retry.
 */
export function processJobsAfterResponse() {
  after(async () => {
    try {
      await processDueJobs({ max: 5, budgetMs: 45_000 });
    } catch (error) {
      console.error('jobs after response failed', error);
    }
  });
}
