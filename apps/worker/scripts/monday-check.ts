// Read-only Monday check: who the token is and which boards it sees. Writes nothing.
// Run: pnpm --filter @creative-hub/worker monday:check
import { checkMondayConnection } from '@creative-hub/connectors';

const c = await checkMondayConnection();
console.log(
  `Connected as ${c.user.name} <${c.user.email}>, account ${c.account.name} (${c.account.slug}.monday.com)`,
);
console.log(`Sees ${c.boards.length} board(s):`);
for (const b of c.boards)
  console.log(
    `  ${b.id}  ${b.name}${b.workspace ? `  [${b.workspace}]` : ''}${b.items == null ? '' : `  · ${b.items} items`}`,
  );
