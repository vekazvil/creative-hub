import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

/** Plain-language messages for Better Auth error codes shown in forms. */
export function authErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'That email and password don’t match.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirm your email first. We’ve sent you a new link.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with this email already exists. Try signing in.';
    case 'EMAIL_DOMAIN_NOT_ALLOWED':
      return 'Use your company email to create an account.';
    case 'PASSWORD_TOO_SHORT':
      return 'That password is too short.';
    case 'INVALID_TOKEN':
      return 'This link has expired or was already used. Ask for a new one.';
    case 'TOO_MANY_REQUESTS':
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return fallback ?? 'Something went wrong. Please try again.';
  }
}
