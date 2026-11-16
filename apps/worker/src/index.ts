import { APP_NAME } from '@creative-hub/core';
import { createDb } from '@creative-hub/db';
import { createJobRunner, jobsConfigSummary } from '@creative-hub/jobs';

// Local runner for the outbox. On Vercel the web app runs the same jobs (after Send and from
// /api/jobs/run), so this is for development and any always-on host.
const log = (msg: string) => console.log(`[worker] ${msg}`);
const { db, pool } = createDb();
const { processJob } = createJobRunner(db);
const POLL_MS = 2_000;
let stopping = false;
let busy = false;

log(`${APP_NAME} worker started (${jobsConfigSummary()})`);
const timer = setInterval(async () => {
  if (stopping || busy) return;
  busy = true;
  try {
    await processJob();
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
  } finally {
    busy = false;
  }
}, POLL_MS);

async function shutdown(signal: NodeJS.Signals) {
  if (stopping) return;
  stopping = true;
  log(`received ${signal}, shutting down`);
  clearInterval(timer);
  while (busy) await new Promise((resolve) => setTimeout(resolve, 50));
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
