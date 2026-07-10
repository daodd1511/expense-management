# Balance Adjustment — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

Note: PLAN.md's Scope of Work item 4 lists the Reports exclusion under
`packages/web`, but the income/expense/net totals and category breakdown are
actually computed server-side in `packages/api/src/features/reports/service.ts`
(confirmed by reading the code — web only renders `useIncomeExpenseReport`'s
response). That work is placed in Phase 1 (api/schema layer) below instead of
Phase 3 — the decision itself (exclude hidden-category transactions from
Reports) is unchanged, only which package implements it.

## STATUS

- Current phase: 1 — in-progress
- Phase 1 — schema, shared types, migration, reports exclusion: in-progress
- Phase 2 — frontend category pickers: pending
- Phase 3 — reconcile balance UI: pending
- Verification debt: none

## Phase 1 — Schema, shared types, migration, reports exclusion

Branch: `balance-adjustment/phase-1-schema-reports` (off `develop`)

Nothing downstream (pickers, reconcile form) can be built until `isHidden`
exists on the `Category` model and the two hidden system categories exist in
the database.

- [x] `packages/shared/src/models/category.model.ts` — add `isHidden: z.boolean()` to `categorySchema`
- [x] `packages/shared/src/dtos/category.dto.ts` — add `is_hidden: z.boolean()` to `categoryRowSchema`
- [x] `packages/shared/src/mappers/category.mapper.ts` — `toCategory`: map `row.is_hidden` → `isHidden`
- [x] New migration `supabase/migrations/<timestamp>_category_balance_adjustment.sql`, pattern per `20260702053135_category_type_hierarchy.sql`:
  - `alter table categories add column is_hidden boolean not null default false`
  - seed two system categories (`owner_id null`): `Balance Adjustment` (`type: expense`, `is_hidden: true`), `Balance Adjustment` (`type: income`, `is_hidden: true`) — pick a neutral icon/color per PLAN.md → "Judgment Calls"
- [x] `packages/api/src/features/reports/service.ts` `getIncomeExpenseReport` — exclude transactions whose `categoryId` matches either seeded hidden category id from `totals` (income/expense/net/transactionCount), the monthly `series`, and `categoryGroups` (the category breakdown). Resolve the two hidden category ids via `categoryById` (already built from `repository.listReportCategories`, which does `select('*')` so `isHidden` flows through once the migration lands) rather than hardcoding ids.
- [x] `packages/api` category routes/controller/service/repository: no code change needed — `listCategories`/`listReportCategories` both `select('*')`, so `isHidden` passes through automatically once the shared mapper is updated. Confirm with the gate below rather than editing.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/shared exec tsc --noEmit` (categorySchema/dto/mapper changes)
- [ ] `pnpm --filter @wallet/api exec tsc --noEmit` (service.ts consumes shared types)
- [ ] `pnpm --filter @wallet/api exec vitest run packages/api/src/features/reports/reports.test.ts packages/api/src/features/categories` (add/extend a reports test asserting a hidden-category transaction is excluded from totals/series/categoryGroups)

**Review checklist (user, at PR review):**
- [ ] Apply the migration locally; confirm the two `Balance Adjustment` categories exist with `is_hidden = true` and correct `type`
- [ ] Hit `GET` categories/reports endpoints directly (or via existing UI) and confirm `isHidden` appears on category payloads and hidden-category transactions are absent from report totals

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Frontend category pickers

Branch: `balance-adjustment/phase-2-pickers` (off `balance-adjustment/phase-1-schema-reports`, stacked)

Depends on `isHidden` existing on `Category` (Phase 1). Purely additive filtering — no new UI surface, safe to land before the reconcile form exists.

- [ ] `packages/web/src/features/transactions/components/TransactionForm.tsx` — `visibleCats` (currently `categories.filter((c) => c.type === type)`) also filters `!c.isHidden`
- [ ] `packages/web/src/features/categories/components/CategoryFilterSelect.tsx` — filter incoming `categories` prop to `!isHidden` before rendering chips (single fix point; both `DesktopTransactionsTable.tsx` and `MobileTransactions.tsx` pass `categories` from `useCategories()` into this component)
- [ ] `packages/web/src/features/budgets/components/BudgetForm.tsx` — `availableCategories` (currently `categories.filter((c) => !conflictsWithExistingBudget(...))`) also filters `!c.isHidden`

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web exec tsc --noEmit`
- [ ] `pnpm --filter @wallet/web exec vitest run packages/web/src/features/transactions/components/TransactionForm.test.tsx packages/web/src/features/categories/components/CategoryFilterSelect.test.tsx` (extend both with a case asserting a hidden category is absent from the rendered options)

**Review checklist (user, at PR review):**
- [ ] Open TransactionForm's category select, `CategoryFilterSelect` (transactions filter), and the budget category picker — confirm neither `Balance Adjustment` category appears in any of them

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Reconcile balance UI

Branch: `balance-adjustment/phase-3-reconcile-ui` (off `balance-adjustment/phase-2-pickers`, stacked)

The user-facing surface; depends on the hidden categories existing (Phase 1) and reuses the existing add-transaction mutation, so it lands last.

- [ ] New `packages/web/src/features/accounts/components/ReconcileBalanceForm.tsx` — shows account's current `computeBalance` result, an actual-balance input, derives signed delta client-side (`actual − computed`), zero delta closes the form with no submission, non-zero submits via `useAddTransaction` with `type`/`categoryId` set per PLAN.md → "Representation" (expense+hidden-expense-category id if computed > actual, income+hidden-income-category id if actual > computed), `amount: Math.abs(delta)`
- [ ] `packages/web/src/features/accounts/components/DesktopAccounts.tsx` — add "Reconcile balance" action to the account row (alongside existing edit/delete actions ~line 112), opens `ReconcileBalanceForm` in the existing `Modal`/drawer pattern
- [ ] `packages/web/src/features/accounts/components/MobileAccounts.tsx` — add "Reconcile balance" action to the account detail `BottomSheet` (~line 170), opens `ReconcileBalanceForm`

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web exec tsc --noEmit`
- [ ] `pnpm --filter @wallet/web exec vitest run packages/web/src/features/accounts` (add `ReconcileBalanceForm.test.tsx` covering: actual < computed → expense txn with hidden expense category id; actual > computed → income txn with hidden income category id; actual == computed → no mutation call)

**Review checklist (user, at PR review):**
- [ ] Reconcile an account with actual < computed balance (mobile + desktop) — expense transaction created, account balance now matches actual
- [ ] Reconcile with actual > computed — income transaction created
- [ ] Reconcile with actual == computed — form closes, no transaction created
- [ ] The created adjustment transaction is editable like any other expense/income transaction
- [ ] A month containing an adjustment: Reports totals and category breakdown exclude the adjustment amount (re-verify end-to-end now that UI can produce one)

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
