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

export interface MondayBoardShape {
  id: string;
  groups: { id: string; title: string }[];
  columns: { id: string; title: string; type: string }[];
}

/** Groups and columns of a board, to find them by title. */
export async function getMondayBoard(boardId: string): Promise<MondayBoardShape> {
  const d = await mondayQuery<{ boards: MondayBoardShape[] }>(
    `query($b:[ID!]){ boards(ids:$b){ id groups{ id title } columns{ id title type } } }`,
    { b: [boardId] },
  );
  const board = d.boards[0];
  if (!board) throw new MondayError(`Monday board ${boardId} not found or not visible`);
  return board;
}

/** An item on the board with exactly this name, so a retried job finds what it made before. */
export async function findMondayItemByName(boardId: string, name: string) {
  const d = await mondayQuery<{
    items_page_by_column_values: { items: { id: string; name: string }[] };
  }>(
    `query($b:ID!, $n:String!){ items_page_by_column_values(board_id:$b, limit:5, columns:[{column_id:"name", column_values:[$n]}]){ items{ id name } } }`,
    { b: boardId, n: name },
  );
  return d.items_page_by_column_values.items.find((i) => i.name === name);
}

export async function createMondayItem(opts: {
  boardId: string;
  groupId?: string;
  name: string;
  columnValues: Record<string, unknown>;
}) {
  const d = await mondayQuery<{ create_item: { id: string } }>(
    `mutation($b:ID!, $g:String, $n:String!, $v:JSON!){ create_item(board_id:$b, group_id:$g, item_name:$n, column_values:$v){ id } }`,
    {
      b: opts.boardId,
      g: opts.groupId ?? null,
      n: opts.name,
      v: JSON.stringify(opts.columnValues),
    },
  );
  return d.create_item.id;
}

export async function listMondaySubitems(itemId: string) {
  const d = await mondayQuery<{ items: { subitems: { id: string; name: string }[] | null }[] }>(
    `query($i:[ID!]){ items(ids:$i){ subitems{ id name } } }`,
    { i: [itemId] },
  );
  return d.items[0]?.subitems ?? [];
}

export async function createMondaySubitem(parentItemId: string, name: string) {
  const d = await mondayQuery<{ create_subitem: { id: string } }>(
    `mutation($p:ID!, $n:String!){ create_subitem(parent_item_id:$p, item_name:$n){ id } }`,
    { p: parentItemId, n: name },
  );
  return d.create_subitem.id;
}

/** Monday user ids for these emails; unknown emails are left out. */
export async function findMondayUserIds(emails: string[]) {
  if (!emails.length) return new Map<string, number>();
  const d = await mondayQuery<{ users: { id: string; email: string }[] }>(
    `query($e:[String]){ users(emails:$e){ id email } }`,
    { e: emails },
  );
  return new Map(d.users.map((u) => [u.email.toLowerCase(), Number(u.id)]));
}
