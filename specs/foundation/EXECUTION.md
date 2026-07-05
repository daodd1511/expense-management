# Foundation — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default) — each phase branches off the
previous phase's branch without waiting for its PR to merge; phase 1 branches off `develop`.
Rebase a stacked phase's branch onto `develop` once an earlier phase in the chain merges.
Frontend code via `react-frontend-developer`; `terse-commit` before commits.

## STATUS

- Current phase: All phases complete
- Phase 1 — Backend atomicity + tooling: `done`
- Phase 2 — Date policy: `done`
- Phase 3 — Store refactor + bulk delete + docs: `done`
- Verification debt: none — migration applied by the user via `npx supabase db push`.

---

## Phase 1 — Backend atomicity + tooling (F2, F7)

Branch: `foundation/phase-1-backend-atomicity` (off `develop` — phase 1 always bases on the
integration branch)

Backend + tooling only, no FE dependency — independently verifiable and revertable.

- [x] **F2 migration** — `supabase/migrations/20260705061832_log_subscription_rpc.sql`:
      `log_subscription(p_owner_id, p_subscription_id, p_type, p_amount, p_category_id,
      p_account_id, p_merchant, p_note, p_tx_date, p_next_due_date)` — single `plpgsql`
      function body (implicit transaction) that row-locks the subscription, inserts the
      transaction, updates `next_due_date`, and returns both rows (flat `tx_*`/`sub_*`
      columns). Kept `INVOKER` (default), scoped by `owner_id = p_owner_id` throughout.
- [x] **F2 route** — rewrote `subscriptionsRouter.post('/:id/log')` in
      `packages/api/src/routes/subscriptions.ts`: kept the fetch + `advanceNextDueDate(...)`
      TS computation, replaced the two-write insert+update with one
      `supabase.rpc('log_subscription', { ... }).single<LogSubscriptionRpcRow>()` call.
      Failures map via `mapDbError`; the returned row is reassembled into
      `transactionRowSchema`/`subscriptionRowSchema` shapes and parsed (defense-in-depth on
      the RPC's return shape). Response contract unchanged — still `{ data: subscription }`,
      matching the FE's `subscriptionResponseSchema` (untouched, out of scope this phase).
      Also hand-added the `log_subscription` entry to `packages/shared/src/database.types.ts`
      `Functions` map (was `[_ in never]: never`) so the `.rpc()` call typechecks — mirrors
      what a real `supabase gen types` regeneration will produce once the migration applies.
- [x] **F7 dev watch** — `packages/api` `dev` script now `tsx watch src/index.ts`; added
      `tsx` devDependency. Verified: booted with `PORT=3999`, `GET /health` responded, edited
      `index.ts` while running → tsx detected the change and restarted, new response
      reflected the edit. Edit reverted after the check (git clean).

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck` — pass
- [x] `pnpm --filter @wallet/api build` — pass
- [x] `pnpm --filter @wallet/api test` — 6 files / 24 tests pass (no existing
      `subscriptions.test.ts`; route has no prior test coverage to preserve)
- [x] Migration applied by the user via `npx supabase db push` (project-local `supabase`
      CLI dep, not on global `$PATH`).

**Review checklist (user, at PR review):**
- [x] Migration applied (`npx supabase db push`) against the linked project.
- [ ] Log a subscription payment (one-tap) → exactly one transaction is created and
      `next_due_date` advances by one cadence.
- [ ] Force the RPC to fail (e.g. a bad param) → **neither** the transaction nor the
      `next_due_date` change persists (atomicity holds).
- [ ] `pnpm dev:api`, edit a source file → server reloads without a manual rebuild.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 2 — Date policy (F3 + F6 date-dependent tests)

Branch: `foundation/phase-2-date-policy` (off `foundation/phase-1-backend-atomicity`, stacked)

Centralizes date-only handling before the refactor relocates the fns that depend on it.

- [x] **F3 utils** — `packages/web/src/shared/lib/date.ts`: `parseLocalDate(iso)`,
      `todayLocalIso(date?)`, `isSameLocalMonth(iso, ref?)`, `diffDays(aIso, bIso)`. No UTC
      parsing of date-only values.
- [x] **F3 replace — store** — `core/store.tsx` `inCurrentMonth` → `isSameLocalMonth`.
- [x] **F3 replace — format** — `shared/lib/format.ts`'s `formatDayLabel`, `formatShortDate`,
      `formatTime` now parse via `parseLocalDate`; display output unchanged for normal cases.
- [x] **F3 replace — subscriptions** — `features/subscriptions/helpers.ts`: `daysUntilDue`,
      `isAlreadyLoggedThisCycle`, `buildNextDueDate` now use `todayLocalIso` / `parseLocalDate`
      / `diffDays`; no `new Date(iso)` UTC parsing, no `toISOString().slice(0,10)` round-trips.
      (`isDue`/`isDueSoon` unchanged — they only compose `daysUntilDue`.)
- [x] **F6 (date-dependent)** — `shared/lib/date.test.ts` (13 tests: all four utils, incl.
      month/year-boundary cases); `features/subscriptions/helpers.test.ts` (17 tests:
      `daysUntilDue`, `isDue`, `isDueSoon`, `isAlreadyLoggedThisCycle`, `buildNextDueDate`,
      via `vi.setSystemTime` for a deterministic "today"); `core/store.test.ts` (3 tests:
      `monthSummary` month-boundary + transfer-exclusion — moves with the fn in Phase 3).

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` — pass
- [x] `pnpm --filter @wallet/web test` — 17 files / 88 tests pass

**Review checklist (user, at PR review):**
- [ ] Near a month boundary, a transaction dated the 1st shows under the current month.
- [ ] Subscription due countdown / "due soon" banner reads correctly at day boundaries.
- [ ] Existing date displays (transaction rows, headers) are visually unchanged.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 3 — Store refactor + bulk delete + docs (F5, F1, F6 computeBalance, F8)

Branch: `foundation/phase-3-store-refactor` (off `foundation/phase-2-date-policy`, stacked)

The heavy mechanical phase — deletes the facade every feature reads through. Landing it last
means Phases 1–2 don't have to chase a moving import surface.

- [x] **Relocate selectors** — moved `computeBalance`, `monthSummary`, `expenseByCategory`,
      `spentForCategory` from `store.tsx` into `shared/lib/derive.ts` (alongside the
      pre-existing `buildDonutData`). Phase 2's `monthSummary` test moved with it
      (`shared/lib/derive.test.ts`, merged with the new `computeBalance` tests below).
- [x] **Migrate consumers** — all `useStore()` call sites replaced with direct feature-query
      hooks across the 22 files named in the plan (layouts, dashboard, categories, budgets,
      subscriptions, transactions, settings, accounts). Added
      `useCategoryLookup`/`useAccountLookup` (categories/accounts `queries.ts`) and
      `useFavoriteCategoryIds` (`favorites-queries.ts`) as the id→entity lookups the facade
      used to provide; added `shared/hooks/useAppDataLoading.ts` for the top-level loading
      gate `MobileApp`/`DesktopApp` used to read off the facade.
- [x] **Delete facade** — `core/store.tsx` and its co-located `store.test.ts` deleted;
      `<StoreProvider>` removed from `main.tsx`.
- [x] **Fix store mocks** — `TransactionForm.test.tsx`, `CategoriesPage.test.tsx`,
      `TransactionRow.test.tsx` now mock the feature hooks (`useCategories`,
      `useCategoryLookup`, `useAccountLookup`, `useFavoriteCategoryIds`, the mutation hooks)
      instead of `@/core/store`.
- [x] **F1 bulk delete** — `DesktopTransactionsTable.tsx`'s `confirmDelete` now calls
      `useDeleteTransactions().mutateAsync(ids)` (single bulk `DELETE`) instead of
      `Promise.all` over per-id `deleteTransaction` calls.
- [x] **F6 (computeBalance)** — `shared/lib/derive.test.ts`: `computeBalance` tests (opening
      balance, income/expense on the matching account, cross-account isolation, transfer
      in/out).
- [x] **F8 docs** — `CLAUDE.md`/`AGENTS.md` re-baselined: facade description removed, new
      "Dates" section for `shared/lib/date.ts`, subscription logging described via the
      `log_subscription` RPC, balance noted as still client-computed.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` — pass
- [x] `pnpm --filter @wallet/web test` — 17 files / 92 tests pass
- [x] `pnpm build` — pass (web build + PWA precache)

**Review checklist (user, at PR review):**
- [ ] App boots with no "must be used within StoreProvider" error; every screen renders
      (accounts, transactions, budgets, subscriptions, categories, dashboard, settings).
- [ ] Account balances match pre-refactor values.
- [ ] Multi-select delete in the desktop table issues a **single** `DELETE /api/transactions`
      (verify in the Network tab), rows disappear.
- [ ] No console errors; mobile + desktop layouts both intact.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
