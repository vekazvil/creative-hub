import path from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type pg from 'pg';

// Separate entry point (`@creative-hub/db/migrate`) so app bundles never pull in the
// migrations folder.
export const migrationsFolder = path.resolve(import.meta.dirname, '../migrations');

export async function runMigrations(pool: pg.Pool) {
  await migrate(drizzle(pool), { migrationsFolder });
}
