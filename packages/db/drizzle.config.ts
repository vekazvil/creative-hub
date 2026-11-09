import { defineConfig } from 'drizzle-kit';

// Local runs read DATABASE_URL from the repo-root .env; CI and servers set it directly.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // no .env — fine
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
