import { defineConfig } from 'vitest/config';

// Local runs read DATABASE_URL from the repo-root .env; CI sets it directly.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // no .env — fine
}

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
