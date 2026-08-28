# Supabase exit — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `docs/specs/RULEBOOK.md`.
Integration branch: `develop`. Branch model: stacked via `gh stack` (default).

## STATUS

- Current phase: 2 — in-progress
- Phase 1 — database baseline and access boundary: done
- Phase 2 — API repositories and authorization: in-progress
- Phase 3 — session authentication and web client: pending
- Phase 4 — migration, validation, and recovery tooling: pending
- Phase 5 — local runtime and integration verification: pending
- Verification debt: none

## Phase 1 — database baseline and access boundary

Branch: `supabase-exit/phase-1-database-baseline` (stacked: `gh stack add` — sequential: off `develop`)

Establish the schema, roles, RLS, and atomic-function contract that every runtime and cutover path consumes.

Consumes: none.
Produces: `db/migrations/*.sql`; `packages/api/src/db/database.ts` exports `Database`, `AppDb`, `withAppTransaction<T>(userId: string, work: (trx: AppDb) => Promise<T>): Promise<T>`, `getAuthPool(): Pool`, and `createAppDatabase(connectionString: string): AppDatabase` (the factory both `withAppTransaction` and the integration tests are built on); PostgreSQL functions `reorder_accounts`, `create_transfer_with_fee`, `log_subscription`, `create_disbursed_loan`, `create_opening_loan`, `create_loan_repayment`, `update_loan_repayment`, `update_loan_disbursement`, and `close_loan`.

Fresh review: required — persistent-data migration, financial operations, and RLS authorization.

- [x] Add `db/migrations/` Dbmate baseline SQL from the reviewed live schema, preserving application tables, System-category seeds, constraints, indexes, triggers, timestamps, and all nine named atomic functions; remove Supabase roles, PostgREST/JWT helpers, and `auth.users` references.
- [x] Add the reviewed Better Auth `auth`-schema migration with UUID identifiers and grants for `wallet_migrator`, `wallet_auth`, and non-bypass-RLS `wallet_app`.
- [x] Add RLS policies and transaction-local `wallet.user_id` access helpers that fail closed, preserve shared System-category reads, and prohibit runtime mutation of System rows.
- [x] Add `packages/api/src/db/database.ts`, `packages/api/src/db/types.ts`, and their tests with separate `wallet_auth` and `wallet_app` pools, explicit search paths, and `withAppTransaction` using transaction-local `set_config`.
- [x] Replace `packages/shared/src/database.types.ts` and `packages/web/src/core/database.types.ts` only where their Supabase-generated types prevent the reviewed Kysely schema contract; do not change shared DTO/model response shapes. — no change needed: neither file is consumed by anything outside its own package's re-export yet, so nothing currently prevents the new Kysely contract in `packages/api/src/db/types.ts`; Phase 2's repository migration is what will actually retire them.
- [x] Update `packages/api/package.json`, root `package.json`, and `pnpm-lock.yaml` to pin Better Auth, Kysely, `pg`, and Dbmate; remove no Supabase package until its runtime replacement is used. — pinned `better-auth` to `1.4.22` (not the `1.7.2` "latest"): the standalone `@better-auth/cli` package's stable release line lags the core library's, and `1.4.22`/`1.4.21` is the newest mutually-compatible stable pair (see `db/migrations/20260828000002_better_auth_schema.sql`).
- [x] Add PostgreSQL 17 integration tests under `packages/api/src/db/` proving clean Dbmate bootstrap, idempotent second migration run, RLS cross-User denial with omitted repository owner predicates, missing transaction identity denial, and transaction-local context cleanup on connection reuse.

**Phase gate (hard):**
- [x] `pnpm typecheck`
- [x] `pnpm exec vitest related --run <files changed in this phase>` — ran as `vitest related --run src/db/database.ts src/db/types.ts src/db/test-helpers.ts` against a throwaway local `postgres:17-bookworm` container (`TEST_DATABASE_URL`); 12/12 passed, twice in a row (no flakiness), ~5.6-7.9s each. These tests `describe.skipIf(!TEST_DATABASE_URL)` — confirmed they skip (not fail) in the normal `pnpm test` run everywhere else. Full workspace `pnpm test`: 118 passed (shared) + 79 passed/11 skipped (api) + 237 passed (web), zero regressions.

**Fresh review:** ran twice (initial + one re-review, per the rulebook's cap).
- Initial review found 2 P1s and 2 P2s: (1) `migrate:down`'s DROP order in `20260828000003_application_schema.sql` would fail (`budgets` referenced `categories` but dropped after it); (2) the same file's `migrate:down` never dropped its two trigger functions; (3) `withAppTransaction` — the interface this phase is supposed to produce — was never exercised against a live database, only a hand-rolled reimplementation of its `set_config` logic; (4) an FK `ON DELETE CASCADE`/`RESTRICT` asymmetry across owner columns looked like an unintentional slip.
- Fixed 1-3 as corrections; verified 4 was not a bug (faithfully reproduces the reviewed source, confirmed against the captured FK section) and documented it in the migration instead of changing it. Fixing #1 via a new automated `dbmate down`/`up` round-trip test (`migrations.test.ts`) surfaced a *second*, distinct DROP-order bug (trigger functions dropped before the tables whose triggers depend on them) and a pre-existing test-harness bug (`withMigratedDatabase` was silently swallowing every `dbmate drop` failure, because every ephemeral test database's connection was still open when drop ran — the entire session's test runs had been leaking databases and their `wallet_app`/`wallet_auth` grants cluster-wide without any visible failure). Fixed both: corrected DROP order, closed each test's connection inside its own `work` callback instead of an external `afterEach`, and replaced the silent catch with visible logging.
- Re-review: no P0/P1 findings; confirmed all four original findings fixed with no regressions. Found 2 more P2s (both latent/inert, zero live callers yet): `closeDatabase()` didn't clear its singletons after closing them, and the new `pg_terminate_backend` safety net was silent even when it did find something to terminate. Fixed both directly (one allowed re-review is exhausted; these were trivial, non-behavior-changing corrections, not a design question needing a third pass) — `pnpm typecheck` and the full DB-integration suite re-run clean afterward.

**Review checklist (user, at PR review):**
- [ ] Inspect the reviewed baseline to confirm User UUID foreign keys, all nine function signatures, System category seeds, grants, and RLS policies match the frozen source behavior.

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — API repositories and authorization

Branch: `supabase-exit/phase-2-api-repositories` (stacked: `gh stack add` — sequential: off `develop`)

Replace the privileged PostgREST data path while retaining every established API contract and atomic financial behavior.

Consumes: `Database`, `AppDb`, `withAppTransaction`, RLS policies, and the nine PostgreSQL functions from `packages/api/src/db/` and `db/migrations/`.
Produces: all feature repositories accept `AppDb`; protected Hono context carries `userId: string` and transaction-bound repository access; `/health/ready` reports database/migration readiness.

Fresh review: required — authorization, financial calculations, and money-protecting rollback paths.

- [ ] Replace `packages/api/src/config/supabase.ts` and `packages/api/src/lib/jwt.ts` usages with Kysely `AppDb` access in `features/accounts`, `analytics`, `budgets`, `categories`, `favorites`, `loans`, `reports`, `subscriptions`, and `transactions` repositories; preserve controllers, services, schemas, DTO mappers, response statuses, and error contracts.
- [ ] Refactor every `packages/api/src/features/*/repository.ts` export to accept an `AppDb` executor; route `accounts/repository.ts`, `loans/repository.ts`, `subscriptions/repository.ts`, and `transactions/repository.ts` through the nine named PostgreSQL functions for multi-row writes.
- [ ] Replace `packages/api/src/middleware/auth.ts` and update `packages/api/src/app.ts` so protected requests resolve a server identity, execute application-data work in `withAppTransaction`, and return `401` without querying User-owned data when no valid identity exists.
- [ ] Update `packages/api/src/config/env.ts`, `packages/api/src/index.ts`, `packages/api/src/app.ts`, and `packages/web/nginx.conf` to remove Supabase runtime configuration and expose database-aware `/health/ready` separately from process `/health` and nginx `/healthz`.
- [ ] Replace Supabase mocks in `packages/api/src/middleware/auth.test.ts`, `packages/api/src/features/*/*.test.ts`, and `packages/api/src/lib/http.test.ts` with PostgreSQL-backed fixtures that assert per-User isolation, API-contract equivalence, atomic rollback, and all nine function behaviors.

**Phase gate (hard):**
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest related --run <files changed in this phase>`

**Review checklist (user, at PR review):**
- [ ] Exercise an owned-data read and a cross-User identifier read/write; confirm the latter reveals no private row and performs no mutation.
- [ ] Exercise transfer-with-fee, subscription logging, account reordering, and loan create/update/close paths; confirm each succeeds or rolls back as one operation.

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 3 — session authentication and web client

Branch: `supabase-exit/phase-3-session-auth` (stacked: `gh stack add` — sequential: off `develop`)

Move authentication transport to same-origin opaque sessions after the API data path can enforce database ownership.

Consumes: Better Auth `auth` schema and `getAuthPool()`/`withAppTransaction()` from Phase 1; protected API contract and `/health/ready` from Phase 2.
Produces: `packages/api/src/auth/better-auth.ts` exports Better Auth handler/session resolution; `AuthContextValue` exposes only email/password sign-in, sign-up, sign-out, `user`, and `loading`; `apiFetch()` sends same-origin credentials without a bearer token.

Fresh review: required — authentication, cookies, proxy trust, and signing secrets.

- [ ] Add `packages/api/src/auth/better-auth.ts`, `packages/api/src/auth/routes.ts`, and auth integration tests; mount Better Auth below the same-origin API namespace in `packages/api/src/app.ts` with UUID records, database rate limits, opaque secure host-only `HttpOnly` `SameSite=Lax` cookies, one-year sliding sessions, daily refresh, no session cache, and validated proxy origin/client-IP handling.
- [ ] Update `packages/api/src/middleware/auth.ts`, `packages/api/src/config/env.ts`, and `packages/api/src/app.ts` to resolve each protected request from Better Auth, retain `AuthEnv`'s `userId: string`, and reject direct spoofed forwarded headers.
- [ ] Replace `packages/web/src/core/supabase.ts`, `packages/web/src/features/auth/auth.tsx`, and `packages/web/src/core/api.ts` with the Better Auth React client/auth context and `fetch(..., { credentials: "same-origin" })`; retain `X-Client-Timezone`, `ApiError`, and existing response validation.
- [ ] Update `packages/web/src/features/auth/components/SignIn.tsx`, `SignUp.tsx`, `AuthCardLayout.tsx`, `auth-errors.ts`, `packages/web/src/routing/router.tsx`, `auth-redirect*.test.ts`, and auth tests to retain email/password redirect behavior while removing Google, forgot-password, and reset-password routes, controls, and components.
- [ ] Remove Supabase browser environment variables from `.env.example`, `packages/web/vite.config.ts`, `packages/web/src/vite-env.d.ts`, and `.github/workflows/ci.yml`; update `packages/web/src/core/api.test.ts` and auth/component tests for cookie sessions.

**Phase gate (hard):**
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest related --run <files changed in this phase>`

**Review checklist (user, at PR review):**
- [ ] Sign up, sign in, refresh, and sign out; confirm the session cookie is opaque and the next protected request after sign-out requires sign-in.
- [ ] Confirm the auth surface offers no Google OAuth or password-recovery control, and authenticated visits to auth pages redirect to the intended protected route.

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 4 — migration, validation, and recovery tooling

Branch: `supabase-exit/phase-4-cutover-tooling` (stacked: `gh stack add` — sequential: off `develop`)

Create reproducible, offline-verified cutover evidence before any maintenance-window operation is authorized.

Consumes: Dbmate migrations, `Database`/`AppDb`, all nine PostgreSQL functions, Better Auth schema, and session API contracts from Phases 1–3.
Produces: `tools/cutover/export.ts`, `import.ts`, `manifest.ts`, `validate.ts`, and `set-password.ts`; `tools/recovery/archive.sh` and `restore-rehearsal.sh`; deterministic `Manifest` comparison that rejects any Transaction ID/content mismatch.

Fresh review: required — encryption, recovery archives, financial-data migration, and irreversible operational writes.

- [ ] Add `tools/cutover/export.ts`, `import.ts`, `manifest.ts`, `validate.ts`, and tests to export only allowed identity fields, preserve UUIDs and financial rows losslessly, calculate canonical per-table and per-Transaction-ID digests, compare global/per-User counts and aggregates, and fail closed on every mismatch or unapproved difference.
- [ ] Add `tools/cutover/set-password.ts` as an interactive hidden-prompt command that creates Better Auth-compatible credential records without command-line, environment, log, or SQL password exposure.
- [ ] Add `tools/recovery/archive.sh`, `restore-rehearsal.sh`, and tests/documented fixtures for custom-format consistent `auth` plus application-schema archives, validation before `age` encryption/checksum/atomic publish, no retained plaintext, and 24-hourly/14-daily/8-weekly rotation.
- [ ] Add the cutover and recovery command interfaces to `package.json` and document local rehearsal inputs, allowed manifest differences, isolated restore verification, and the maintenance-window abort-before-reopen rule in `docs/`.
- [ ] Add integration fixtures/tests proving preserved User UUIDs and foreign keys, each Transaction's column-level digest, financial aggregates, no orphans, recovery restore success, and equivalence of all nine named functions.

**Phase gate (hard):**
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest related --run <files changed in this phase>`

**Review checklist (user, at PR review):**
- [ ] Review a rehearsal manifest showing exact table and per-Transaction digest equality, preserved owner counts, and equivalent financial aggregates before authorizing a maintenance window.
- [ ] Review a restore rehearsal from an encrypted archive and confirm the archive-retention claim is limited to the documented same-disk/manual-off-host model.

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 5 — local runtime and integration verification

Branch: `supabase-exit/phase-5-local-integration` (stacked: `gh stack add` — sequential: off `develop`)

Publish the tested application artifacts and local runtime contract consumed by the coordinated deploy-repository spec without changing production deployment files here.

Consumes: database, API, session, cutover, and recovery interfaces from Phases 1–4.
Produces: local `docker-compose.yml` PostgreSQL/migrator/recovery services; `packages/api/Dockerfile` and `packages/web/Dockerfile` artifacts; deployment handoff documented as `/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/PLAN.md`.

Fresh review: required — CI/test-gate infrastructure, secrets boundary, and deployment/recovery rollback paths.

- [ ] Update `docker-compose.yml`, `.env.example`, `packages/api/Dockerfile`, `packages/web/Dockerfile`, and Docker build inputs for local PostgreSQL 17, a one-shot Dbmate migrator, application/auth runtime credentials, Better Auth secrets, readiness dependency, and a least-privilege recovery job; do not edit production Compose files outside this repository.
- [ ] Update `.github/workflows/ci.yml` and add PostgreSQL 17 integration-test setup so the app CI validates the target database/runtime without Supabase variables or services.
- [ ] Remove `supabase/`, `packages/api/src/config/supabase.ts`, `packages/api/src/lib/jwt.ts`, Supabase package references, and remaining active Supabase configuration only after their replacements and tests are present.
- [ ] Update `README.md`, `CLAUDE.md`, `.env.example`, Docker comments, and operational documentation to name local PostgreSQL as the source of truth and reference the coordinated deploy plan at `/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/EXECUTION.md` for production Compose, secrets staging, rehearsal, cutover, and user-confirmed Supabase retirement.

**Phase gate (hard):**
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest related --run <files changed in this phase>`

**Review checklist (user, at PR review):**
- [ ] Start the local target stack from an empty PostgreSQL 17 volume; confirm Dbmate finishes before the API readiness endpoint succeeds and neither image nor web bundle contains a database credential.
- [ ] Confirm the app and deployment specs agree that production cutover and hosted-project deletion run only through the deploy repo's operational/user-review lane.

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review checklist goes into the PR description.

## Spec gate (hard — once, before the final phase's PR)

- [ ] `pnpm test`
- [ ] `pnpm --filter @wallet/api typecheck && pnpm build`
