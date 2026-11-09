import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema';

export type Database = ReturnType<typeof createDb>['db'];

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}

export { schema };
