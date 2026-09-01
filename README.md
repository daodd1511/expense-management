# Quản Lý Tài Chính (Wallet)

Personal finance manager for Vietnamese users: track income, expenses, and
transfers across accounts, with budgets, subscriptions, loans, and reports.
Amounts are VND integers; UI is Vietnamese-first (English secondary).
Installable as an online-only PWA with purpose-built mobile and desktop
layouts.

## Stack

- **pnpm monorepo** — `packages/web`, `packages/api`, `packages/shared`, and
  `db/migrations/`
- **web** — Vite + React 19 + TypeScript SPA, Tailwind v4,
  shadcn/base-ui primitives, TanStack Query, Recharts, vite-plugin-pwa
- **api** — Hono on Node, PostgreSQL 17 through Kysely, and Better Auth
- **shared** — Zod DTOs, row↔model mappers, plain TS models used by both
- **wallet-ops** — immutable Dbmate migrations, administrator bootstrap, cutover,
  and encrypted recovery commands shared by local and production orchestration

## Getting started

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env   # replace every password/secret placeholder
docker compose up -d postgres migrator role-bootstrap
pnpm dev               # api on :3000 + web on http://localhost:5173
```

The single root `.env` feeds everything: the api loads it via dotenv, Vite
reads the `VITE_*` vars from it, and `docker compose` interpolates it for
local container runs.

## Scripts

```bash
pnpm dev            # api + web in parallel
pnpm dev:web        # web only
pnpm dev:api        # api only
pnpm build          # web production build
pnpm typecheck      # tsc --noEmit across all packages
pnpm test           # vitest run across all packages
pnpm lint           # oxlint
pnpm format         # oxfmt --write
```

Scoped: `pnpm --filter @wallet/web <script>` (same for `@wallet/api`,
`@wallet/shared`).

## Architecture

Each feature slice follows the same path:

```
component → features/<f>/queries.ts (TanStack Query hooks)
          → features/<f>/db.ts (fetch client with Zod response validation)
          → api features/<domain>/ routes → controller → service → repository
          → PostgreSQL 17 (RLS enforces the authenticated User boundary)
```

`layouts/ResponsiveApp.tsx` switches at 1024px between a mobile layout
(bottom tabs, sheets) and a desktop layout (sidebar, drawers) — two
purpose-built UIs, not one stretched component.

Key decisions live in [`docs/adr/`](docs/adr/); domain vocabulary in
[`CONTEXT.md`](CONTEXT.md); feature specs in [`docs/specs/`](docs/specs/).

## Deployment

Self-hosted: web, API, and PostgreSQL run as Docker containers behind a Cloudflare
Tunnel. This repository publishes SHA-matched API, web, and secret-free operations
images plus the tested local runtime contract; production Compose, secrets staging, rehearsal, cutover, rollback, and
user-confirmed hosted-project retirement are controlled by the deploy repository's
`/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/EXECUTION.md`.
See [`docs/deployment/self-hosting.md`](docs/deployment/self-hosting.md).
