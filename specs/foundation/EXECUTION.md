# Foundation — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default) — each phase branches off the
previous phase's branch without waiting for its PR to merge; phase 1 branches off `develop`.
Rebase a stacked phase's branch onto `develop` once an earlier phase in the chain merges.
Frontend code via `react-frontend-developer`; `terse-commit` before commits.

## STATUS

- Current phase: none started
- Phase 1 — Backend atomicity + tooling: `pending`
- Phase 2 — Date policy: `pending`
- Phase 3 — Store refactor + bulk delete + docs: `pending`
- Verification debt: none

---

## Phase 1 — Backend atomicity + tooling (F2, F7)

Branch: `foundation/phase-1-backend-atomicity` (off `develop` — phase 1 always bases on the
integration branch)

Backend + tooling only, no FE dependency — independently verifiable and revertable.

- [ ] **F2 migration** — new `supabase/migrations/<ts>_log_subscription_rpc.sql`: define
      `log_subscription(p_owner_id, p_subscription_id, p_tx <fields>, p_next_due_date)` that,
      in a single function body (implicit transaction), inserts the transaction row and
      updates `subscriptions.next_due_date` for that owner+id, then returns the inserted
      transaction row and the updated subscription row. `SECURITY DEFINER` not required —
      keep it `INVOKER` and rely on the existing RLS/`owner_id` guards; scope every write by
      `owner_id = p_owner_id`.
- [ ] **F2 route** — rewrite `subscriptionsRouter.post('/:id/log')` in
      `packages/api/src/routes/subscriptions.ts`: keep the fetch + `advanceNextDueDate(...)`
      TS computation, then replace the two-write insert (`:83`) + update (`:105`) with one
      `supabase.rpc('log_subscription', { ... })` call. Map failures via `mapDbError`; parse
      the returned rows with `transactionRowSchema` / `subscriptionRowSchema` and return the
      same response shape as today.
- [ ] **F7 dev watch** — change `packages/api` `dev` script in `packages/api/package.json`
      from build-once + `node dist/index.js` to a source watcher (`tsx watch src/index.ts`,
      add `tsx` as a dev dep if absent). Confirm `pnpm dev:api` boots and reloads on edit.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/api typecheck`
- [ ] `pnpm --filter @wallet/api build`
- [ ] `pnpm --filter @wallet/api test` (if the package has tests; otherwise note none exist)
- [ ] Migration SQL authored and syntax-sane. **Applying** it (`supabase db push`) needs live
      Supabase credentials — foreseeably env-blocked for the agent; mark `[~]` with the SQL
      diff as substitute evidence and mirror to STATUS debt if it can't be applied here.

**Review checklist (user, at PR review):**
- [ ] Apply the migration (`supabase db push`) against the linked project.
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

- [ ] **F3 utils** — new `packages/web/src/shared/lib/date.ts` exporting (with doc comments):
      `parseLocalDate(iso)` → `new Date(y, m-1, d)` from a `'YYYY-MM-DD'` string;
      `todayLocalIso()` → local `'YYYY-MM-DD'`; `isSameLocalMonth(iso, ref?)`;
      `diffDays(aIso, bIso)`. No UTC parsing of date-only values.
- [ ] **F3 replace — store** — `core/store.tsx` `inCurrentMonth` (`:294–297`) → `isSameLocalMonth`.
- [ ] **F3 replace — format** — `shared/lib/format.ts` date parses (`:26, :42, :47, :53`) →
      `parseLocalDate`; keep the display output identical for normal cases.
- [ ] **F3 replace — subscriptions** — `features/subscriptions/helpers.ts`
      (`:14, :16, :31, :33–35, :40–41, :55, :58–64`): `daysUntilDue`, `isDue`, `isDueSoon`,
      the due-window comparison in `isAlreadyLoggedThisCycle`, and `buildNextDueDate` →
      `todayLocalIso` / `parseLocalDate` / `diffDays`; no `new Date(iso)` UTC parsing, no
      `toISOString().slice(0,10)` round-trips.
- [ ] **F6 (date-dependent)** — `shared/lib/date.test.ts` (all four utils, incl. month-boundary
      and cross-offset cases); `features/subscriptions/helpers.test.ts` (`isDue`, `isDueSoon`,
      `daysUntilDue`, `isAlreadyLoggedThisCycle`, `buildNextDueDate` under the new policy);
      a `monthSummary` test at its current `core/store.tsx` export (relocated in Phase 3 —
      the test's import moves with it).

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (incl. the three new/updated test files)

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

- [ ] **Relocate selectors** — move `computeBalance` (`store.tsx:331`) to `shared` (e.g.
      `shared/lib/derive.ts`); move `monthSummary` (`:300`) and `spentForCategory` to a
      `shared`/feature lib. Update the Phase 2 `monthSummary` test import to the new location.
- [ ] **Migrate consumers** — replace every `useStore()`/`l()` destructure with direct
      feature-query hooks (`useTransactions`, `useAccounts`, `useCategories`, `useBudgets`,
      `useSubscriptions`, favorites hooks, and the feature mutation hooks) across:
      `layouts/mobile/MobileApp.tsx`, `layouts/mobile/MobilePlanning.tsx`,
      `layouts/desktop/DesktopApp.tsx`, `features/categories/components/CategoriesPage.tsx`,
      `features/dashboard/components/{DesktopDashboard,MobileHome}.tsx`,
      `features/subscriptions/components/{SubscriptionDueBanner,MobileSubscriptions,DesktopSubscriptions,SubscriptionForm}.tsx`,
      `features/transactions/components/{DesktopTransactionsTable,MobileTransactions,TransactionRow,TransactionForm}.tsx`,
      `features/settings/components/Settings.tsx`,
      `features/budgets/components/{BudgetForm,MobileBudgets,BudgetBars,DesktopBudgets}.tsx`,
      `features/accounts/components/{AccountList,DesktopAccounts,MobileAccounts}.tsx`.
- [ ] **Delete facade** — remove `StoreProvider`, `useStore`, and `l` from `core/store.tsx`
      and drop `<StoreProvider>` from the app root (find its mount, likely `main.tsx`/`App`).
      Delete `store.tsx` if nothing but re-exports remains.
- [ ] **Fix l() mocks** — `features/transactions/components/TransactionForm.test.tsx`,
      `features/categories/components/CategoriesPage.test.tsx`,
      `features/transactions/components/TransactionRow.test.tsx`: mock the feature hooks
      instead of `l()`.
- [ ] **F1 bulk delete** — `features/transactions/components/DesktopTransactionsTable.tsx`
      multi-select delete calls `useDeleteTransactions(ids)` (single bulk request); the
      facade's `deleteTransactions` N-loop (`store.tsx:139`) is gone with the facade.
- [ ] **F6 (computeBalance)** — unit test for `computeBalance` at its relocated `shared`
      location (income/expense/transfer in + transfer out, opening balance).
- [ ] **F8 docs** — update `CLAUDE.md` architecture/commands: remove the `store.tsx`
      facade description, add `shared/lib/date.ts` and the `log_subscription` RPC, and note
      balances are still client-computed (server-balance is Spec 2).

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] `pnpm build`

**Review checklist (user, at PR review):**
- [ ] App boots with no "must be used within StoreProvider" error; every screen renders
      (accounts, transactions, budgets, subscriptions, categories, dashboard, settings).
- [ ] Account balances match pre-refactor values.
- [ ] Multi-select delete in the desktop table issues a **single** `DELETE /api/transactions`
      (verify in the Network tab), rows disappear.
- [ ] No console errors; mobile + desktop layouts both intact.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
