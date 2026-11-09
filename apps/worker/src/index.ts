import { APP_NAME } from '@creative-hub/core';

// Outbox consumer. pg-boss, operations and retries arrive with task 1.11.
const log = (msg: string) => console.log(`[worker] ${msg}`);

log(`${APP_NAME} worker started`);

const keepAlive = setInterval(() => {}, 60_000);

function shutdown(signal: NodeJS.Signals) {
  log(`received ${signal}, shutting down`);
  clearInterval(keepAlive);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
