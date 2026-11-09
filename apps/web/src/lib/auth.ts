import 'server-only';

import { isEmailAllowed } from '@creative-hub/core';
import { schema } from '@creative-hub/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';

import { resetPasswordEmail, verificationEmail } from './auth-emails';
import { getDb } from './db';
import { getEmailSender } from './email';
import { env } from './env';
import { PASSWORD_MIN_LENGTH } from './validation';

function createAuth() {
  const config = env();
  return betterAuth({
    appName: 'Creative Hub',
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      usePlural: true,
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
      },
    }),
    advanced: {
      database: { generateId: 'uuid' },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await getEmailSender().send(resetPasswordEmail(user, url));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await getEmailSender().send(verificationEmail(user, url));
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isEmailAllowed(user.email, config.allowedEmailDomains)) {
              throw new APIError('FORBIDDEN', {
                code: 'EMAIL_DOMAIN_NOT_ALLOWED',
                message: 'Use your company email to create an account.',
              });
            }
            return { data: { ...user, email: user.email.toLowerCase() } };
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** Better Auth server instance, created on first use. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
