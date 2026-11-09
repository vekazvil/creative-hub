import 'server-only';

import { parseAllowedDomains } from '@creative-hub/core';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url(),
  AUTH_ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return {
    ...parsed.data,
    allowedEmailDomains: parseAllowedDomains(parsed.data.AUTH_ALLOWED_EMAIL_DOMAINS),
  };
}

let cached: ReturnType<typeof load> | undefined;

/** Validated server environment. Read lazily so `next build` works without secrets. */
export function env() {
  cached ??= load();
  return cached;
}
