/*
 * Monday.com over its GraphQL API. For now only reads: who the token belongs to and which
 * boards it can see, so we know the connection works before anything is written there.
 */

const MONDAY_API = 'https://api.monday.com/v2';
const API_VERSION = '2025-04';

export interface MondayBoard {
  id: string;
  name: string;
  workspace: string | null;
  items: number | null;
}

export interface MondayConnection {
  user: { name: string; email: string };
  account: { name: string; slug: string };
  boards: MondayBoard[];
}

export class MondayError extends Error {}

/**
 * HARD RULE: Creative Hub never deletes anything on Monday. It is the client's live data.
 * Any mutation that deletes, archives, clears or removes something is refused here,
 * before it reaches the API. Do not loosen this; ask a person to do such cleanup by hand.
 */
const DESTRUCTIVE = /\b(delete|archive|clear|remove|unsubscribe|disconnect)_?\w*\s*[({]/i;

export function assertNotDestructive(query: string) {
  if (/\bmutation\b/i.test(query) && DESTRUCTIVE.test(query))
    throw new MondayError('Refused: Creative Hub never deletes, archives or clears on Monday.');
}

/** One GraphQL call. Monday answers 200 with `errors` for query problems, so both are checked. */
export async function mondayQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token = process.env.MONDAY_API_TOKEN,
): Promise<T> {
  assertNotDestructive(query);
  if (!token) throw new MondayError('MONDAY_API_TOKEN is not configured');
  const response = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: token,
      'api-version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    errors?: { message: string }[];
    error_message?: string;
  } | null;
  const problem =
    body?.errors?.map((e) => e.message).join('; ') ||
    body?.error_message ||
    (!response.ok ? `HTTP ${response.status}` : undefined);
  if (problem || !body?.data) throw new MondayError(`Monday API: ${problem ?? 'empty response'}`);
  return body.data;
}

/** Read-only check: the token's user and account, and the boards it can see. */
export async function checkMondayConnection(token?: string): Promise<MondayConnection> {
  const data = await mondayQuery<{
    me: { name: string; email: string; account: { name: string; slug: string } };
    boards: {
      id: string;
      name: string;
      items_count: number | null;
      workspace: { name: string } | null;
    }[];
  }>(
    `query {
      me { name email account { name slug } }
      boards(limit: 100, state: active, order_by: used_at) {
        id name items_count workspace { name }
      }
    }`,
    {},
    token,
  );
  return {
    user: { name: data.me.name, email: data.me.email },
    account: data.me.account,
    boards: data.boards.map((b) => ({
      id: b.id,
      name: b.name,
      workspace: b.workspace?.name ?? null,
      items: b.items_count,
    })),
  };
}
