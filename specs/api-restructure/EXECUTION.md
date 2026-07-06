# API Restructure — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

Inventory at activation (all prerequisite specs — `foundation`, `feature-ux`, `polish` —
merged into `develop`): `packages/api/src/routes/{accounts,transactions,categories,
budgets,favorites,subscriptions,analytics}.ts`, `lib/http.ts`, `middleware/auth.ts`,
`db/supabase.ts`, `index.ts`. Route sizes: `categories.ts` 266, `subscriptions.ts` 274,
`transactions.ts` 149, `accounts.ts` 123, `budgets.ts` 102, `favorites.ts` 91,
`analytics.ts` 77 lines. Existing route-level tests: `accounts`, `analytics`,
`categories`, `favorites`, `transactions`. **No existing test file for `budgets` or
`subscriptions`** — those two domains migrate without an automated HTTP-level safety
net; flagged per-phase below as a review-checklist item, not agent debt.

## Open items resolved from PLAN.md

- **Phase 2 split (complex vs. simple)**: PLAN.md left this open, to decide "from the
  merged route sizes." Resolved here by size + business-logic weight: `categories`
  (hierarchy validation) and `subscriptions` (RPC orchestration) are the two largest and
  most logic-heavy files, so they get their own phase (3); `transactions`, `budgets`,
  `favorites`, `analytics` are comparatively thin CRUD/read routes and share phase 2.
  This is a structural grouping call, not a behavior decision — noted inline, not asked,
  per spec-plan Step 1 (inconsequential to correctness).
- **Error taxonomy**: kept exactly as PLAN.md specified — mirror `mapDbError`'s existing
  two cases (`23505`→409, `23503`→409, default→500). No extension unless a domain proves
  it's needed during migration.
- **Budgets/subscriptions test gap**: not in scope to backfill new automated tests (PLAN's
  non-goals rule out new behavior/scope creep); instead each phase's review checklist
  calls out manual verification for these two domains specifically, since they lack the
  "existing test suite passes unchanged" safety net the other domains have.

## STATUS

- Current phase: 2 — done
- Phase 1 — Infra + accounts reference feature: done
- Phase 2 — Simple domains (transactions, budgets, favorites, analytics): done
- Phase 3 — Complex domains (categories, subscriptions): pending
- Phase 4 — Cleanup + docs: pending
- Verification debt: none yet

## Phase 1 — Infra + accounts reference feature

Branch: `api-restructure/phase-1-infra-accounts` (off `develop`)

Nothing downstream can start without the shared infra (config, lib, middleware) landing
first; `accounts` (smallest route file, no cross-entity cascade logic) is the reference
pattern the later phases copy.

- [x] Add `@hono/zod-validator` and `pino` to `packages/api/package.json` dependencies
- [x] `packages/api/src/config/env.ts` — new; centralizes `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, `PORT` reads currently scattered
  across `db/supabase.ts`, `middleware/auth.ts`, `index.ts`
- [x] `packages/api/src/config/supabase.ts` — moved from `db/supabase.ts`, reading via
  `config/env.ts`
- [x] `packages/api/src/lib/jwt.ts` — new; extract `getProjectJwks`/`jwtVerify` logic out
  of `middleware/auth.ts` (still `jose`); `middleware/auth.ts` consumes it
- [x] `packages/api/src/lib/response.ts` — moved from `lib/http.ts`: `jsonError`,
  `parseRawJsonBody`, `parseJsonBody`, `parseRows` (the body/response helpers only)
- [x] `packages/api/src/middleware/error.ts` — new; absorbs `mapDbError`'s Postgres-code
  mapping (`23505`/`23503`→409, default→500+server log) as the centralized error handler;
  services throw typed errors, this middleware maps them
- [x] `packages/api/src/middleware/logger.ts` — new; `pino`-based structured request
  logging, replacing `hono/logger` and the raw `console.error`/`console.log` call sites in
  `lib/http.ts` and `index.ts`
- [x] `packages/api/src/app.ts` — new; `createApp()` wires `Hono<AuthEnv>`, `cors`,
  the new logger/error middleware, `/health`, `authMiddleware`, and feature routes
- [x] `packages/api/src/index.ts` — trimmed to just `serve(createApp(), { port })`
  bootstrap
- [x] `packages/api/src/features/accounts/{schema.ts,repository.ts,service.ts,
  controller.ts,routes.ts}` — migrate `routes/accounts.ts`: `repository.ts` wraps the
  Supabase list/insert/update/archive calls via shared mappers; `service.ts` holds the
  `computeBalance` reduction currently inline in the GET handler; `controller.ts` is thin
  HTTP handlers using `@hono/zod-validator` for `accountCreateSchema`/`accountPatchSchema`;
  `routes.ts` wires controller → Hono
- [x] Move `routes/accounts.test.ts` → `features/accounts/accounts.test.ts`; update its
  `vi.mock('../db/supabase')` path to the new `config/supabase` location; behavior
  assertions unchanged
- [x] Delete `routes/accounts.ts`, `routes/accounts.test.ts`, `db/supabase.ts`; delete
  `lib/http.ts` only if no other route still imports it (categories/subscriptions/etc.
  still do until their own phases land — leave it in place until then)

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck`
- [x] `pnpm --filter @wallet/api test`
- [x] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**
- [ ] Run the dev API and hit `GET/POST/PATCH/DELETE /api/accounts` — confirm identical
  responses/status codes to pre-refactor behavior
- [ ] Confirm pino-formatted logs appear in place of the old `console.log`/`hono/logger`
  output during a local dev run

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Simple domains (transactions, budgets, favorites, analytics)

Branch: `api-restructure/phase-2-simple-domains` (off
`api-restructure/phase-1-infra-accounts`, stacked)

These four routes are comparatively thin CRUD/read handlers with no cross-entity
cascade or RPC orchestration — same shape as the `accounts` reference, migrated as a
batch.

- [x] `packages/api/src/features/transactions/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/transactions.ts` (149 lines); move
  `transactions.test.ts`
- [x] `packages/api/src/features/budgets/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/budgets.ts` (102 lines); **no existing test to move** —
  see review checklist below
- [x] `packages/api/src/features/favorites/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/favorites.ts` (91 lines); move `favorites.test.ts`
- [x] `packages/api/src/features/analytics/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/analytics.ts` (77 lines, carries the
  `computeBalanceTrend` wiring from `feature-ux` — keep that call in `service.ts`); move
  `analytics.test.ts`
- [x] Wire all four routers into `app.ts`; remove the four old `routes/*.ts` files and
  their moved test files
- [x] Leave `lib/http.ts` in place for Phase 3 because `categories`/`subscriptions`
  are still the remaining consumers on the old route stack

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck`
- [x] `pnpm --filter @wallet/api test`
- [x] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**
- [ ] Manually verify `budgets` CRUD via the running dev server/UI (no automated
  route-level test exists for this domain, before or after this refactor)
- [ ] Verify `GET /api/analytics/balance-trend` output is byte-identical for a known
  account/date range before vs. after

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Complex domains (categories, subscriptions)

Branch: `api-restructure/phase-3-complex-domains` (off
`api-restructure/phase-2-simple-domains`, stacked)

These two carry real business logic beyond CRUD (category hierarchy rules, the
`log_subscription` RPC + date math) — split from Phase 2 so that logic lands in
`service.ts` deliberately rather than as a batch afterthought.

- [ ] `packages/api/src/features/categories/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/categories.ts` (266 lines): `service.ts` owns
  `loadParentCandidate`, the 2-level nesting cap, type-match rules, and the
  re-parent/child/budget-conflict checks currently inline in the POST/PATCH/DELETE
  handlers; `repository.ts` wraps the `categories`/`transactions`/`subscriptions`/
  `budgets` table access needed for the cascading updates on delete. Move
  `categories.test.ts` (233 lines)
- [ ] `packages/api/src/features/subscriptions/{schema,repository,service,controller,
  routes}.ts` — migrate `routes/subscriptions.ts` (274 lines): `service.ts` owns the
  `buildNextDueDate`/`advanceNextDueDate` orchestration and the `log_subscription` RPC
  call + `LogSubscriptionRpcRow` mapping currently inline in `POST /:id/log` and `PATCH`;
  `repository.ts` wraps subscriptions table CRUD + the RPC call. **No existing test to
  move** — see review checklist below
- [ ] Wire both routers into `app.ts`; remove `routes/categories.ts`,
  `routes/categories.test.ts`, `routes/subscriptions.ts`
- [ ] Delete `lib/http.ts` and `routes/` directory now that nothing imports them (or
  defer final deletion to Phase 4 if anything still lingers)

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/api typecheck`
- [ ] `pnpm --filter @wallet/api test`
- [ ] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**
- [ ] Manually verify category CRUD including the nesting-cap, type-mismatch, and
  budget-conflict error cases (400/403/404/409 responses unchanged)
- [ ] Manually verify the subscription log-payment flow (`POST /api/subscriptions/:id/
  log`) produces an identical transaction row and correctly advanced `next_due_date` —
  no automated test exists for this domain, before or after this refactor

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 4 — Cleanup + docs

Branch: `api-restructure/phase-4-cleanup` (off
`api-restructure/phase-3-complex-domains`, stacked)

Final pass once every feature has moved: remove now-dead scaffolding and re-baseline the
docs that still describe the old flat-route shape.

- [ ] Delete `packages/api/src/routes/` (should already be empty), `packages/api/src/
  lib/http.ts`, `packages/api/src/db/` if anything remains
- [ ] `rg` the repo for any leftover imports of the deleted paths (`routes/`, `lib/http`,
  `db/supabase`) and fix/remove them
- [ ] Re-baseline `CLAUDE.md`'s architecture section (lines ~25-27, ~75, ~115, ~253) —
  currently describes `packages/api/src/routes/<entity>.ts` as the flow; replace with the
  `features/<domain>/{controller,service,repository,schema,routes}.ts` layered shape
- [ ] Same pass on `AGENTS.md` wherever it mirrors the same `packages/api` description

**Agent gate (hard):**
- [ ] `pnpm typecheck` (full monorepo — confirms `packages/web`/`packages/shared` have no
  stray references to deleted API-internal paths)
- [ ] `pnpm test` (full monorepo)
- [ ] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**
- [ ] Confirm the final `packages/api/src` tree matches PLAN.md's target structure
- [ ] Confirm `CLAUDE.md`/`AGENTS.md` accurately describe the new layered architecture

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
