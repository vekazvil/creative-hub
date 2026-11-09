import 'server-only';

import { createDb } from '@creative-hub/db';

import { env } from './env';

type Db = ReturnType<typeof createDb>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __creativeHubDb?: Db };

export function getDb() {
  globalForDb.__creativeHubDb ??= createDb(env().DATABASE_URL);
  return globalForDb.__creativeHubDb.db;
}
