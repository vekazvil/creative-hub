import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { runMigrations } from '../migrate';
import * as schema from '../schema';

/**
 * Creates a fresh, migrated database for one test file and drops it afterwards.
 * Uses DATABASE_URL only to reach the server; the data lives in a throwaway database.
 */
export async function createTempDb(baseUrl = process.env.DATABASE_URL) {
  if (!baseUrl) throw new Error('DATABASE_URL is not set');

  const name = `ch_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();

  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  await runMigrations(pool);
  const db = drizzle(pool, { schema, casing: 'snake_case' });

  async function drop() {
    await pool.end();
    const c = new pg.Client({ connectionString: baseUrl });
    await c.connect();
    await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await c.end();
  }

  return { db, pool, drop };
}
