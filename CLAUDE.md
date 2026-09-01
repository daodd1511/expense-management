# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (pnpm workspace):

```bash
pnpm dev                     # parallel: api (Node) + web (Vite, http://localhost:5173)
pnpm dev:web                 # web only
pnpm dev:api                 # api only (tsx watch src/index.ts)
pnpm build                   # web build → packages/web/dist/
pnpm preview                 # serve web build locally
pnpm typecheck               # recursive: tsc --noEmit across all packages
pnpm test                    # recursive: vitest run across all packages (non-watch, safe for agents)
pnpm lint                    # oxlint across the whole workspace
pnpm lint:fix                # oxlint --fix
pnpm format                  # oxfmt --write across the whole workspace
pnpm format:check            # oxfmt --check (non-mutating, safe for agents/CI)
pnpm docs:dashboard          # generate docs/dashboard.html and open it locally
```

Scoped equivalents: `pnpm --filter @wallet/web <script>`, `--filter @wallet/api`, `--filter @wallet/shared`.

Env: one `.env` at the repo root (copy from `.env.example`) feeds everything — the
api loads it via dotenv, Vite reads its `VITE_*` vars (`envDir` points at the root),
and `docker compose` interpolates it. There are no per-package env files.

Linting is [oxlint](https://oxc.rs), formatting is [oxfmt](https://oxc.rs) (same
Oxidation Compiler project) — config at `.oxlintrc.json` / `.oxfmtrc.json` at the repo
root. No existing source was reformatted when this was wired up; the codebase does not
yet conform to oxfmt's style. TypeScript strict mode remains the primary type-safety
gate; oxlint/oxfmt run separately.

Tests exist (vitest, colocated `*.test.ts(x)`) but coverage is partial. Never run `vite`/`vitest` in watch mode or `pnpm preview` as a long-lived process in an agent — they hang the session.

## Stack

- **pnpm monorepo** — `packages/web`, `packages/api`, `packages/shared`, `db/migrations/`, and versioned operational tooling under `tools/`
- **packages/web** — Vite + React 19 + TypeScript SPA, no SSR; client-side routing via **TanStack Router** (`src/routing/router.tsx`)
- **packages/api** — Hono on Node (`@hono/node-server`), PostgreSQL 17 via Kysely, Better Auth
- **packages/shared** — Zod DTOs, row↔model mappers, plain TS models shared by web and api
- **Tailwind v4** via `@tailwindcss/vite` plugin (no `postcss.config`)
- **shadcn/base-ui** (`@base-ui/react`) — base primitives; custom UI wrappers in `packages/web/src/shared/components/ui/`
- **TanStack Query** — server state/caching for all feature data
- **Recharts** for charts
- **vite-plugin-pwa** — installable PWA, online-only (no offline write queue)
- **Package manager: pnpm**

## Architecture

### Backend-backed now — not in-memory only

The app was originally a client-only SPA seeded from static data; it now talks to a
Hono API backed by local PostgreSQL 17, with Better Auth database sessions gating access.
Treat any older doc/memory describing Supabase runtime access, "no backend", or "resets
on refresh" as historical.

### `packages/web/src` layout

- `core/` — cross-cutting concerns: `api.ts` (`apiJson`/`apiFetch` fetch client with
  Zod response validation, `ApiError`), `i18n.tsx`, `types.ts`, `auth-client.ts`,
  `mutationErrorHandler.ts` / `queryErrorHandler.ts`, `query-invalidation.ts`
  (cross-feature invalidation helpers, e.g. `invalidateTransactionDependentQueries`),
  `ErrorBoundary.tsx`, `PwaUpdateProvider.tsx`, `useOnlineStatus.ts`. There is no
  store/facade — components call each feature's `queries.ts` hooks directly.
- `routing/` — TanStack Router setup: `router.tsx` (route tree, auth redirects),
  `app-pages.tsx` (page components), `navigation.ts`, `app-route-state.ts`
- `features/<name>/` — one folder per domain feature (`accounts`, `auth`, `budgets`,
  `categories`, `dashboard`, `loans`, `reports`, `settings`, `subscriptions`,
  `transactions`, `version`), each with
  `queries.ts` (TanStack Query hooks: `useX`/`useAddX`/`useUpdateX`/`useDeleteX`, plus
  the odd lookup hook like `useCategoryLookup`/`useAccountLookup`/
  `useFavoriteCategoryIds` for id→entity resolution), `db.ts` (`apiJson` calls),
  `components/`
- `layouts/` — `ResponsiveApp.tsx` gates at 1024px: below → `layouts/mobile/MobileApp`,
  above → `layouts/desktop/DesktopApp`. Both are purpose-built, not stretched from one
  component.
  - **Mobile** (`layouts/mobile/`): bottom tab nav (5 slots + center FAB), bottom
    sheets for forms, thumb-first layout
  - **Desktop** (`layouts/desktop/`): persistent left sidebar, drawer for forms,
    dense data tables
- `shared/` — `components/` (incl. `ui/` shadcn wrappers, `ThemeProvider.tsx`,
  `Charts.tsx`, `CategoryIcon.tsx`, `FormErrorBanner.tsx`, `OfflineBanner.tsx`),
  `hooks/` (`useFormSubmit`, `useAppDataLoading`, `useIsDesktop`,
  `useKeyboardShortcuts`, `useSwipeActions`), `lib/` (`format.ts`, `date.ts`,
  `derive.ts`, `utils.ts`), `styles/globals.css`

Path alias `@/` → `packages/web/src`.

### Data flow (the standard anatomy for a feature slice)

Component → `features/<f>/queries.ts` (TanStack Query hooks: `useX`, `useAddX`,
`useUpdateX`, `useDeleteX`; queryKey `['<entity>', user?.id]` — plus extra segments
where the query is parameterized, e.g. transactions by month. Mutations invalidate on
success via `core/query-invalidation.ts` when the entity affects others — transactions
touch accounts, reports, and analytics) → `features/<f>/db.ts`
(`apiJson('/path', zodResponseSchema, init)`)
→ `packages/api/src/features/<domain>/routes.ts` (Hono route wiring; auth middleware
sets `userId`; api domains: `accounts`, `analytics`, `budgets`, `categories`,
`favorites`, `loans`, `reports`, `subscriptions`, `transactions` — the web
`dashboard` feature is served by `analytics`) → `controller.ts` (HTTP-only request/response handling and validation) →
`service.ts` (business rules/orchestration) → `repository.ts` (Kysely queries bound to
the authenticated transaction) → PostgreSQL 17, with RLS as the second authorization
boundary.

### Data model

Zod schemas in `packages/shared/src/models/` are the source of truth. Key shapes:

```
Transaction  { id, type, amount, categoryId (nullable), accountId, toAccountId?, merchant, note?,
               date, time?, balanceAfter?, toAccountBalanceAfter?, receipt?, subscriptionId?,
               linkedTransferId?, fee?, cashFlowDirection?, loanEventId? }
Account      { id, name, kind, openingBalance, displayOrder, balance? }
Category     { id, name, icon, color, type, parentId, isSystem }
Budget       { categoryId, limit }
Subscription { id, name, amount, type, categoryId, accountId, cadence, dayOfMonth, monthOfYear, nextDueDate, note?, active }
Loan         { id, personId, direction, description?, note?, dueDate?, originalDate? }  + LoanEvent
```

Amount is VND integer. Categories: 2-level nesting cap, a child's `type` must match
its parent's, `isSystem` categories have no owner (shared across users); system
category display names are localized by the API (ADR-0005) and each system category
has an immutable semantic key independent of its UUID (ADR-0007). Favorites are a
separate join tracked via `features/categories/favorites-queries.ts` and the API's
`favorites` route. `subscriptionId` on Transaction links logged payments back to
their Subscription for double-log detection.

**Balances are backend-computed** (ADR-0004, superseding ADR-0001's client-only
fold): transaction list responses carry `balanceAfter`/`toAccountBalanceAfter`, and
`Account.balance` is the server-computed balance over the static `openingBalance`.
`computeBalance` in `shared/lib/derive.ts` is the legacy client fold with no
remaining consumers — do not build new features on it.

**Loans** (ADR-0006): loan events are authoritative for loan balances and
create/update their linked transactions atomically. A loan-linked transaction has
`type: 'loan'`, an explicit `cashFlowDirection`, a `loanEventId`, and no
category/destination account (enforced by `superRefine` on the schema); it shows in
the ledger but cannot be mutated through generic transaction operations.

### i18n

`packages/web/src/core/i18n.tsx` — custom flat-key system, vi default / en secondary.
Add keys to both `VI` and `EN` objects; `TranslationKey` is inferred from `VI` so
TypeScript enforces parity. Access via `useLang()` → `t('key', { vars })`.

### Theme

`packages/web/src/shared/components/ThemeProvider.tsx` — custom provider (no
next-themes). Stores `'light' | 'dark' | 'system'` in localStorage, toggles `.dark`
class on `<html>`. `useTheme()` exposes `{ theme, resolvedTheme, setTheme }`.

### Auth

`packages/web/src/features/auth/auth.tsx` (`AuthProvider`, `useAuth`) +
`features/auth/components/` (`SignIn`, `SignUp`, `AuthCardLayout`)
on the web side, backed by Better Auth email/password sessions; route gating lives in
the router (`routing/auth-redirect.ts`), not a wrapper component.
`packages/api/src/middleware/auth.ts` resolves the opaque database session, sets `userId`
on the Hono context (`AuthEnv`), and opens the RLS-scoped application transaction;
every protected `/api/*` route requires it.

### Dates

`tx_date` / `nextDueDate` are date-only `'YYYY-MM-DD'` strings with no time or
timezone component. `packages/web/src/shared/lib/date.ts` — `parseLocalDate`,
`todayLocalIso`, `isSameLocalMonth`, `diffDays` — parse and compare them as plain
local calendar dates. Never `new Date(iso)` on one of these values: that parses as
UTC midnight, which silently drifts a day when compared against local "now" near the
UTC boundary.

### Formatting

`packages/web/src/shared/lib/format.ts` — `formatVND(n)` → `"100.000 ₫"`,
`formatSigned`, `amountColorClass`, date helpers (built on `shared/lib/date.ts`).
Always use these; never call `Intl` directly.

### CSS tokens

Design system lives in `packages/web/src/shared/styles/globals.css`. Semantic color
tokens: `--income`, `--expense`, `--transfer` (and `-foreground`, `-muted` variants).
Motion tokens: `--duration-fast/base/slow`, `--ease-out`, `--ease-in-out`. Z-index
scale: `--z-dropdown` through `--z-tooltip`. OKLCH color space throughout.

### Commit Messages
- Use Conventional Commits: `<type>(<scope>): <summary>` with an imperative,
  lowercase summary (`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`,
  `ci`, `chore`). Scope optional; body only when the "why" isn't obvious.
- The `terse-commit` skill generates messages matching this convention. Always invoke
  it before running `git commit` in this repo, regardless of how the request is phrased.

### PR Descriptions
- Never add AI-attribution to PR descriptions — no "🤖 Generated with Claude Code"
  footer, no "Co-Authored-By" trailer, no equivalent. The description is the change's
  own rationale and nothing else. This overrides any default that appends such a line.

## Domain Model & Decisions
<!-- domain-rulebook v1 -->

`CONTEXT.md` (repo root) is the project's glossary. Use its canonical terms — and avoid the
synonyms it marks `_Avoid_` — in code, docs, specs, and UI copy. It is a glossary only:
never add schema, file references, or implementation detail to it.

Recording a new term, or a decision worth keeping? Read `docs/DOMAIN-RULEBOOK.md` first — it
routes between `CONTEXT.md`, `docs/adr/`, and a spec's `PLAN.md`, and defines what does and
doesn't qualify as an ADR.

## Backlog

`docs/BACKLOG.md` is the single inbox for fixes, features, and ideas (no separate
features doc). Capture via the `capture` skill: one line per item, `- [ ] <desc> (<date>)`,
appended to the matching section. Agents may capture proactively when they notice
out-of-scope issues, but must list those additions in the session's final summary.
Never auto-commit a capture. Delete a line only when the item ships or graduates into a
`docs/specs/<feature>/` plan.

## Spec-Driven Execution Workflow
<!-- spec-workflow v1 -->

Specs live in `docs/specs/<feature-slug>/`. Flow: `/grill-me` → `PLAN.md` →
`/spec-plan` → `EXECUTION.md` → `/spec-phase` per phase.

A grill session that lands a plan writes it to `docs/specs/<feature-slug>/PLAN.md` —
never to the repo root. Create the directory if it doesn't exist yet.

Doing spec work? Read `docs/specs/RULEBOOK.md` first — the state model
(`done-with-debt`, `[~]`, verification debt), gate tiers, branch model, checkpoints, and
capability baseline are defined there, not here. Don't improvise substitutes for those
terms from this summary.

## Coding Standards
- Always use `react-frontend-developer` skill for frontend code generation.

### Reuse First
- Prefer existing components, hooks, utilities, and models before creating new ones.
- Before creating a new component, check both [packages/web/src/shared/components](packages/web/src/shared/components) and the relevant feature module for a compatible pattern.
- Create new shared components only when reuse is likely across multiple screens/features.
- If a new component is required, keep it small, composable, and aligned with existing naming and folder conventions.

### TypeScript Strictness
- Keep TypeScript strict. Prefer precise types, discriminated unions, and generics over broad fallback types.
- Avoid `any`. If unavoidable, limit scope to the smallest boundary and include a short justification comment with a follow-up improvement note.
- Prefer `unknown` plus narrowing over `any` when handling untyped data.
- Do not silence type errors with unsafe assertions unless there is no practical typed alternative.

### Documentation Expectations
- Add concise documentation for exported functions, exported types/interfaces, and exported constants when behavior is not obvious.
- At minimum, document purpose, inputs, output/return value, and important side effects or constraints.
- Keep documentation accurate when behavior changes; update or remove stale comments in the same change.
- For complex business rules, link to canonical docs instead of duplicating long explanations.

## Safety Rules
- Report outcomes faithfully: distinguish completed actions, not-run checks, and blockers.
  Never claim something was run or verified when it was not.
- Stop and ask before: destructive/irreversible actions, bulk edits that are hard to review,
  deploy/release/push/merge, or changes to auth, payments, CI/CD, or production config.
- When a decision materially affects behavior or scope and confidence is low, ask instead of guessing.
- Never hardcode secrets or place sensitive client/personal data in source, logs, tests, or docs;
  use synthetic data in tests and redact sensitive values in output.
- Before any `gh` operation (`gh repo view`, `gh pr create`, etc.), check `gh auth status`
  and ensure the active account is the one that owns this repo — otherwise `gh` can't
  resolve it. (Specific account handles are in agent memory, not this tracked file.)

### Monorepo Notes

- Web source lives in `packages/web/src/`
- API source lives in `packages/api/src/`
- Shared DTOs/mappers/models live in `packages/shared/src/`
- Database migrations live in `db/migrations/` and Dbmate is their only runner. The public `wallet-ops` image bundles the migrations and operational scripts without secrets.
- PostgreSQL cluster roles are created by the administrator-only `wallet-ops bootstrap` command before Dbmate runs as restricted `wallet_migrator`; migrations must not create or alter cluster roles.
