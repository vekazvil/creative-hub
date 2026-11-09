# Creative Hub

Intake for requests to the creative team (Vilore Foods, La Costeña USA pilot). Replaces the custom GPT and Zap by 11 Dec 2026.

Docs: [plan](docs/PLAN.md) · [wireframe](docs/WIREFRAME.md) · [tasks](docs/TASKS.md)

## Structure

```
apps/web            Next.js App Router: forms, checks, my requests, admin, API (route handlers)
apps/worker         Node process: drains the outbox, calls connectors, retries
packages/core       Domain logic: request states, Texas working days, urgency, work-type schemas
packages/db         Drizzle schema, migrations, client
packages/connectors Monday, Google, Slack, email, OpenAI — each an interface, a real version and a fake
```

## Getting started

Requires Node 24 and pnpm (`corepack enable pnpm`), plus Docker for local Postgres.

```sh
pnpm install
cp .env.example .env
pnpm db:up          # Postgres 17 on localhost:5432
pnpm dev            # web on http://localhost:3000 + worker
```

## Scripts

| Command                                      | What it does                    |
| -------------------------------------------- | ------------------------------- |
| `pnpm lint`                                  | ESLint over the whole repo      |
| `pnpm typecheck`                             | `tsc` in every package          |
| `pnpm test`                                  | Vitest in every package         |
| `pnpm build`                                 | Next.js build and worker bundle |
| `pnpm format`                                | Prettier                        |
| `pnpm --filter @creative-hub/db db:generate` | Generate a Drizzle migration    |

CI (GitHub Actions) runs format check, lint, typecheck, test and build on every push.

## Rules

1. Nothing on the live Monday board until gate 4.
2. Keys only in the secret store — never in the repo, prompts or Slack.
3. Every external write goes through the outbox, keyed by `(request_id, operation)`.
4. AI never invents: missing fields stay empty and flagged.
5. Test and production IDs are kept apart in `env_settings`.
6. Visibility is enforced on the server; AI never receives a project the user can't see.
