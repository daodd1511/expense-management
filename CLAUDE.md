# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (pnpm workspace):

```bash
pnpm dev                     # parallel: api (Node) + web (Vite, http://localhost:5173)
pnpm dev:web                 # web only
pnpm dev:api                 # api only (builds then runs dist/index.js)
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

Linting is [oxlint](https://oxc.rs), formatting is [oxfmt](https://oxc.rs) (same
Oxidation Compiler project) — config at `.oxlintrc.json` / `.oxfmtrc.json` at the repo
root. No existing source was reformatted when this was wired up; the codebase does not
yet conform to oxfmt's style. TypeScript strict mode remains the primary type-safety
gate; oxlint/oxfmt run separately.

Tests exist (vitest, colocated `*.test.ts(x)`) but coverage is partial. Never run `vite`/`vitest` in watch mode or `pnpm preview` as a long-lived process in an agent — they hang the session.

## Stack

- **pnpm monorepo** — `packages/web`, `packages/api`, `packages/shared`, plus `supabase/` (migrations)
- **packages/web** — Vite + React 19 + TypeScript SPA, no SSR, no client-side routing (nav is tab/screen state, no react-router)
- **packages/api** — Hono on Node (`@hono/node-server`), Supabase as the database
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
Hono API backed by Supabase Postgres, with Supabase Auth gating access. Treat any
older doc/memory describing "no backend" or "resets on refresh" as historical.

### `packages/web/src` layout

- `core/` — cross-cutting concerns: `api.ts` (`apiJson`/`apiFetch` fetch client with
  Zod response validation, `ApiError`), `data.ts` (legacy seed data), `i18n.tsx`,
  `types.ts`, `supabase.ts`, `mutationErrorHandler.ts`, `ErrorBoundary.tsx`. There is
  no store/facade — components call each feature's `queries.ts` hooks directly.
- `features/<name>/` — one folder per domain feature (`accounts`, `auth`, `budgets`,
  `categories`, `dashboard`, `settings`, `subscriptions`, `transactions`), each with
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
  `hooks/` (`useFormSubmit`, `useAppDataLoading`), `lib/` (`format.ts`, `date.ts`,
  `derive.ts`, `utils.ts`), `styles/globals.css`

Path alias `@/` → `packages/web/src`.

### Data flow (the standard anatomy for a feature slice)

Component → `features/<f>/queries.ts` (TanStack Query hooks: `useX`, `useAddX`,
`useUpdateX`, `useDeleteX`; queryKey `['<entity>', user?.id]`, invalidated on
mutation success) → `features/<f>/db.ts` (`apiJson('/path', zodResponseSchema, init)`)
→ `packages/api/src/features/<domain>/routes.ts` (Hono route wiring; auth middleware
sets `userId`) → `controller.ts` (HTTP-only request/response handling and validation) →
`service.ts` (business rules/orchestration) → `repository.ts` (Supabase access via
shared mappers) → Supabase Postgres, with `packages/shared/src/mappers/*` converting
rows↔models (`toX` row→model, `fromX` model→row, `xPatchToRow`).

### Data model

```
Transaction  { id, type, amount, categoryId, accountId, toAccountId?, merchant, note?, date, receipt?, subscriptionId? }
Account      { id, name, kind, balance }
Category     { id, name, icon, color, type, parentId, isSystem }
Budget       { categoryId, limit }
Subscription { id, name, amount, type, categoryId, accountId, cadence, dayOfMonth, monthOfYear, nextDueDate, note?, active }
```

Amount is VND integer. Categories: 2-level nesting cap, a child's `type` must match
its parent's, `isSystem` categories have no owner (shared across users). Favorites
are a separate join tracked via `features/categories/favorites-queries.ts` and the
API's `favorites` route. `subscriptionId` on Transaction links logged payments back
to their Subscription for double-log detection. `Account.balance` is a static
opening balance; computed balance = `opening + Σincome − Σexpense ± transfers` via
`computeBalance` in `shared/lib/derive.ts` (client-computed; consumers fetch all
transactions and reduce locally — no server-side balance endpoint yet).

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
`features/auth/components/{AuthGate,SignIn}.tsx` on the web side, backed by
Supabase Auth. `packages/api/src/middleware/auth.ts` verifies the JWT (via `jose`)
and sets `userId` on the Hono context (`AuthEnv`); every `/api/*` route requires it.

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
- The `terse-commit` skill generates messages matching this convention (plain
  imperative subject, no Conventional Commits prefix). Always invoke it before
  running `git commit` in this repo, regardless of how the request is phrased.

## Domain Model & Decisions

Three homes for terminology and decisions — keep them from bleeding into each
other. The `domain-modeling` skill (and `grill-with-docs`, which folds it into a
grilling session) maintains the first two.

- **`CONTEXT.md`** (repo root) — the ubiquitous-language glossary, and nothing
  else. Use its canonical terms (and avoid the `_Avoid_` synonyms) in code,
  docs, specs, and UI copy. It is devoid of implementation detail: no schema, no
  file references, no "how it works". Add or sharpen a term the moment grilling
  resolves one; never let it become a spec or scratchpad.
- **`docs/adr/`** — one short ADR per **app-wide** decision that is hard to
  reverse, surprising without context, and the result of a real trade-off (all
  three, or it is not an ADR). A handful, ever. Numbered `NNNN-slug.md`, 1–3
  sentences.
- **`docs/specs/<feature>/PLAN.md` "Decisions"** — feature-scoped choices that live
  and die with the spec. The default home. If a decision only matters inside one
  feature, it stays here and does **not** become an ADR.

## Backlog

`docs/BACKLOG.md` is the single inbox for fixes, features, and ideas (no separate
features doc). Capture via the `capture` skill: one line per item, `- [ ] <desc> (<date>)`,
appended to the matching section. Agents may capture proactively when they notice
out-of-scope issues, but must list those additions in the session's final summary.
Never auto-commit a capture. Delete a line only when the item ships or graduates into a
`docs/specs/<feature>/` plan.

## Spec-Driven Execution Workflow

Large/architectural changes flow: `/grill-me` → `docs/specs/<feature>/PLAN.md` →
`docs/specs/<feature>/EXECUTION.md` (via the `spec-plan` skill) → phased implementation (via the
`spec-phase` skill). These rules bind even when neither skill is invoked. Design rationale:
`docs/specs/spec-workflow-v2/PLAN.md`. Use `/grill-with-docs` instead of `/grill-me` when the
grilling should also maintain the glossary and ADRs (see "Domain Model & Decisions").

### State model
- **Git is the authoritative state store**: branch name encodes spec+phase
  (`<feature-slug>/phase-<n>-<desc>`), commits encode progress. Each `EXECUTION.md` opens
  with a **STATUS block** (current phase, per-phase state, verification debt) — the only
  prose trusted as state. **On any conflict, git wins silently** for mechanical facts
  (branch, commits, merged-or-not); STATUS is trusted only for what git can't express
  (debt, park reasons). `HANDOFF.md` is a session baton from `/handoff` — advisory context,
  never authority; do not resume from it.
- Phase states: `pending` / `in-progress` / `done` / `done-with-debt`. Gate items are
  `[ ]`/`[x]`; an item may be `[~]` (deferred) only when environment-blocked (missing
  tool/credentials, not effort), with substitute evidence inline and a mirrored STATUS debt
  entry. A phase is in-progress iff it has unchecked **non-deferred** items.
- `docs/specs/INDEX.md` is a **generated report** (`pnpm specs:index`), never hand-edited.
  After touching any STATUS block, rerun it and commit the regenerated INDEX.md in the
  same commit. STATUS blocks must keep the canonical format the script enforces (see
  `docs/specs/spec-index/PLAN.md`); the script fails loudly on drift. On conflict, git and
  STATUS win — INDEX.md is advisory, like `HANDOFF.md`.

### Branch model — stacked by default
- **Default: stacked.** Each phase branches off the **previous phase's branch** (phase 1
  off the integration branch, currently `develop`; resolve at plan time, never hardcode).
  Push → PR to the previous phase's branch (or to the integration branch if the previous
  phase already merged) → continue to the next phase without waiting for review/merge.
  Rebase onto the integration branch after an earlier phase's PR merges.
- **Sequential (off develop, wait for merge) is opt-in only** — use it only when the user
  explicitly says so for this spec (e.g. "do phases sequentially" / "wait for merge before
  the next phase"). When opted in: each phase branches off the integration branch → push →
  PR → user reviews & merges → pull → next phase branches off the updated integration
  branch.
- After a phase's PR merges, ask before deleting the merged phase branch (local + remote).

### Checkpoints
- Starting a phase authorizes its commits — nothing else.
- Gate pass → one ask: "push + open PR?". Remote actions are never bundled with anything
  else (see Hard Stops below).
- A phase is complete only when its **agent gate** (typecheck, tests, build) actually
  passed — checking boxes doesn't substitute for running it — **and the phase PR's CI is
  green**. The local gate is a pre-PR smoke check; CI's full run is authoritative, and red
  CI on a phase PR is the agent's to fix before the phase is done. Manual verification
  scenarios are the **review checklist**, listed in the PR description for the user to walk
  through before merging — they are the user's, not agent debt.
- **One spec in flight at a time.** Do not start or resume a different spec's phase while
  another has an unfinished phase. Finish the current phase, or explicitly **park** it with
  the user's go-ahead: a `WIP: parked <date>` commit on the phase branch plus a STATUS note
  (never `git stash` — stashes are invisible to a cold agent and easy to orphan).

Procedure lives in the skills — planning in `.claude/skills/spec-plan/SKILL.md`, execution
and resume in `.claude/skills/spec-phase/SKILL.md` — invoke the relevant one rather than
re-deriving it.

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
- This repo (`daodd1511/expense-management`) lives under the personal GitHub account, not the
  company one. Before any `gh` operation (`gh repo view`, `gh pr create`, etc.), check
  `gh auth status`; if the active account is the company account (`daoduong-saritasa`), run
  `gh auth switch --user daodd1511` first — otherwise `gh` can't resolve the repo.

### Monorepo Notes

- Web source lives in `packages/web/src/`
- API source lives in `packages/api/src/`
- Shared DTOs/mappers/models live in `packages/shared/src/`
- Database migrations live in `supabase/migrations/`
