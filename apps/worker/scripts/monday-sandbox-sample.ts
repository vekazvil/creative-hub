// Builds the "option A" sample in VH_Sandbox: a board with the Master Board's columns, labels and
// groups (no automations), and one sample project. Only creates; never deletes (see monday.ts).
// Safe to re-run: what already exists is found by name and reused.
// Run: pnpm --filter @creative-hub/worker exec tsx --env-file=../../.env scripts/monday-sandbox-sample.ts <step>
//   step = board | columns | item
import { mondayQuery } from '@creative-hub/connectors';

const SANDBOX_WORKSPACE = 18226164; // VH_Sandbox
const MASTER_BOARD = 8048849611; // 🎨 Creative Projects — Master Board (read only)
const BOARD_NAME = '🎨 Creative Projects — Master Board (Creative Hub sample)';
const GROUPS = [
  '📥 Brief & Planning',
  '📝 Production',
  '🔄 Revisions / Adjustments by Requester',
  'On Goings',
  '✅ Delivered',
  '⏸ On Hold',
];
const SKIP_TYPES = new Set(['name', 'subtasks']);

type Column = { id: string; title: string; type: string; settings_str: string };
type Board = {
  id: string;
  name: string;
  groups: { id: string; title: string }[];
  columns: Column[];
};

const json = (v: unknown) => JSON.stringify(v);

async function board(id: number | string): Promise<Board> {
  const d = await mondayQuery<{ boards: Board[] }>(
    `query($id:[ID!]){ boards(ids:$id){ id name groups{ id title } columns{ id title type settings_str } } }`,
    { id: [String(id)] },
  );
  return d.boards[0]!;
}

async function findSample(): Promise<Board | undefined> {
  const d = await mondayQuery<{ boards: { id: string; name: string }[] }>(
    `query($ws:[ID!]){ boards(workspace_ids:$ws, limit:100){ id name } }`,
    { ws: [String(SANDBOX_WORKSPACE)] },
  );
  const hit = d.boards.find((b) => b.name === BOARD_NAME);
  return hit ? board(hit.id) : undefined;
}

/** Labels only, in the shape create_column accepts. */
function defaultsFor(c: Column): string | undefined {
  const s = JSON.parse(c.settings_str || '{}');
  if (c.type === 'status' && s.labels) return json({ labels: s.labels });
  if (c.type === 'dropdown' && s.labels) return json({ settings: { labels: s.labels } });
  return undefined;
}

async function stepBoard() {
  const existing = await findSample();
  if (existing)
    return console.log(
      'Board exists:',
      existing.id,
      existing.groups.map((g) => g.title),
    );
  const d = await mondayQuery<{ create_board: { id: string } }>(
    `mutation($name:String!, $ws:ID!){ create_board(board_name:$name, board_kind:public, workspace_id:$ws, empty:true){ id } }`,
    { name: BOARD_NAME, ws: String(SANDBOX_WORKSPACE) },
  );
  const b = await board(d.create_board.id);
  console.log(
    'Created board',
    b.id,
    'groups:',
    b.groups.map((g) => g.title),
    'columns:',
    b.columns.map((c) => c.title),
  );
}

async function stepColumns() {
  const sample = await findSample();
  if (!sample) throw new Error('Run the board step first');
  const master = await board(MASTER_BOARD);
  // The new board's default group becomes the last one (renamed, never deleted).
  const placeholder = sample.groups.find((g) => g.title === 'Group Title');
  if (placeholder) {
    await mondayQuery(
      `mutation($b:ID!, $g:String!, $v:String!){ update_group(board_id:$b, group_id:$g, group_attribute:title, new_value:$v){ id } }`,
      { b: sample.id, g: placeholder.id, v: GROUPS.at(-1)! },
    );
    sample.groups = sample.groups.map((g) =>
      g === placeholder ? { ...g, title: GROUPS.at(-1)! } : g,
    );
  }
  // Groups: create_group puts a new group on top, so go bottom-up.
  for (const title of [...GROUPS].reverse()) {
    if (sample.groups.some((g) => g.title === title)) continue;
    await mondayQuery(
      `mutation($b:ID!, $t:String!){ create_group(board_id:$b, group_name:$t){ id } }`,
      {
        b: sample.id,
        t: title,
      },
    );
    console.log('group', title);
  }
  for (const c of master.columns) {
    if (SKIP_TYPES.has(c.type) || sample.columns.some((s) => s.title === c.title)) continue;
    const defaults = defaultsFor(c);
    await mondayQuery(
      `mutation($b:ID!, $t:String!, $type:ColumnType!, $d:JSON){ create_column(board_id:$b, title:$t, column_type:$type, defaults:$d){ id } }`,
      { b: sample.id, t: c.title, type: c.type, d: defaults ?? null },
    );
    console.log('column', c.type, c.title);
  }
  const after = await board(sample.id);
  console.log(
    'Now:',
    after.groups.map((g) => g.title),
    after.columns.map((c) => `${c.title} [${c.type}]`),
  );
}

async function stepItem() {
  const sample = await findSample();
  if (!sample) throw new Error('Run the board step first');
  const col = (title: string) => {
    const c = sample.columns.find((x) => x.title === title);
    if (!c) throw new Error(`Missing column ${title}`);
    return c.id;
  };
  const group = sample.groups.find((g) => g.title === '📥 Brief & Planning')!;
  const name = '01-.000 – LC – Pizza Expo booth materials (Creative Hub sample)';

  const existing = await mondayQuery<{
    boards: { items_page: { items: { id: string; name: string }[] } }[];
  }>(`query($b:[ID!]){ boards(ids:$b){ items_page(limit:50){ items{ id name } } } }`, {
    b: [sample.id],
  });
  let itemId = existing.boards[0]!.items_page.items.find((i) => i.name === name)?.id;
  if (!itemId) {
    const values = {
      [col('🚦 Status')]: { label: 'Planning' },
      [col('⚡ Priority')]: { label: 'Normal' },
      [col('✏️ Draft Due Date')]: { date: '2026-12-01' },
      [col('🏁 Final Deadline')]: { date: '2026-12-08' },
      [col('📋 Brief Document')]: {
        url: 'https://creative-hub-six-psi.vercel.app',
        text: 'Brief in Creative Hub',
      },
      [col('📂 Category / Task Type')]: { labels: ['RetractableBanner'] },
      [col('🏷️ Brand')]: { labels: ['La Costeña'] },
    };
    const d = await mondayQuery<{ create_item: { id: string } }>(
      `mutation($b:ID!, $g:String!, $n:String!, $v:JSON!){ create_item(board_id:$b, group_id:$g, item_name:$n, column_values:$v){ id } }`,
      { b: sample.id, g: group.id, n: name, v: json(values) },
    );
    itemId = d.create_item.id;
    console.log('item', itemId);
  }

  const subs = await mondayQuery<{ items: { subitems: { id: string; name: string }[] }[] }>(
    `query($i:[ID!]){ items(ids:$i){ subitems{ id name } } }`,
    { i: [itemId] },
  );
  const have = new Set(subs.items[0]!.subitems.map((s) => s.name));
  const wanted = [
    'Pizza Expo booth materials – Copy',
    'Pizza Expo booth materials – Design',
    'Pizza Expo booth materials – Review',
    'Pizza Expo booth materials – Deployment',
    'Asset: Booth backdrop – 10×8 ft – ×1',
    'Asset: Retractable banner – 33×80 in – ×2',
  ];
  for (const n of wanted) {
    if (have.has(n)) continue;
    await mondayQuery(
      `mutation($p:ID!, $n:String!){ create_subitem(parent_item_id:$p, item_name:$n){ id board{ id } } }`,
      { p: itemId, n },
    );
    console.log('subitem', n);
  }
  console.log(`Done: https://vilore-squad.monday.com/boards/${sample.id}`);
}

const step = process.argv[2];
if (step === 'board') await stepBoard();
else if (step === 'columns') await stepColumns();
else if (step === 'item') await stepItem();
else console.log('step = board | columns | item');
