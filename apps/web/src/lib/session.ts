import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuth } from './auth';

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/** Session for a protected page; sends signed-out visitors to the sign-in page. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
