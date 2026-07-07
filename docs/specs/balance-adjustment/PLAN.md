# Balance Adjustment — Plan

Produced via /grill-me interview. All decisions below were explicitly confirmed;
do not reinterpret or expand scope during implementation.

## Problem

`Account.balance` (computed as `opening + Σincome − Σexpense ± transfers` via
`computeBalance` in `shared/lib/derive.ts`) can drift from the real-world balance
you see in a bank app or by counting cash — a missed transaction, a rounding
difference, an untracked charge. There is no way today to correct it without
inventing a fake expense/income category, which would pollute Reports.

## Goals

- Let the user reconcile an account: enter the actual (real) balance, have the
  app compute and post the signed correction automatically.
- Keep the correction out of Reports' income/expense totals and category
  breakdown — a reconciliation isn't spending or earning.
- Entry point lives on the account itself, since that's where the mismatch is
  noticed.

## Non-Goals

- No automatic/scheduled reconciliation (e.g. bank sync) — this is a manual,
  user-triggered action only.
- No new `Transaction.type` — reuses `expense`/`income`, distinguished by sign.
- No changes to `computeBalance` itself — an adjustment behaves exactly like
  any other single-account expense/income for balance purposes.

## Product Decisions

- **Trigger**: "Reconcile balance" action on the account detail view (mobile)
  / account row or drawer (desktop).
- **Form**: shows the account's current computed balance, an input for the
  actual balance, and derives the signed delta client-side
  (`actual − computed`).
- **Representation**: a normal `Transaction` — `type: 'expense'` if the delta
  is negative (computed > actual), `type: 'income'` if positive (actual >
  computed) — tagged with a dedicated system category (see below). `amount`
  is `Math.abs(delta)`. Zero delta: no transaction created, just closes the
  form (nothing to correct).
- **Category**: two new system categories, `isHidden: true` —
  `Balance Adjustment` (expense-type, for deficits) and `Balance Adjustment`
  (income-type, for surpluses) — a category's `type` is fixed and must match
  its transaction's `type`, so one hidden category per direction is required
  (mirrors the existing `Other` / `Other Income` split).
- **Reports exclusion**: any transaction whose `categoryId` is one of these
  two hidden category ids is excluded from income/expense/net totals and the
  category breakdown, everywhere Reports aggregates by category.
- **Category picker visibility**: requires a new `isHidden: boolean` field on
  `Category` (default `false`). All manual category pickers (category select
  in `TransactionForm`, `CategoryFilterSelect`, budget category picker) filter
  `!isHidden`. The reconcile flow does not use a picker — it assigns the
  hidden category id directly based on computed sign.

## Judgment Calls (not asked, noted here)

- The two hidden categories are seeded as system categories (no owner,
  shared across users) via a migration, same pattern as the existing 42
  system categories in `20260702053135_category_type_hierarchy.sql`.
- Icon/color for the two categories: pick something visually distinct from
  real spending categories (e.g. a neutral/gray "scale" or "wrench" icon) —
  cosmetic, not worth a question.
- Editing an adjustment transaction after creation behaves like editing any
  expense/income transaction (amount/date/note editable); there's no special
  "re-reconcile" flow — if the balance drifts again, reconcile again.

## Scope of Work

1. **`packages/shared`**:
   - `models/category.model.ts` — add `isHidden: z.boolean()` to
     `categorySchema`.
   - `mappers/category.mapper.ts` — map `isHidden` row↔model, `toX`/`fromX`.
2. **`supabase/migrations/`**: new migration —
   - Add `is_hidden boolean not null default false` column to the categories
     table.
   - Seed two system categories: `Balance Adjustment` (expense, `isHidden`),
     `Balance Adjustment` (income, `isHidden`).
3. **`packages/api`**: category routes/controller/service/repository pass
   `isHidden` through unchanged (no new endpoint — reuses existing category
   read path); no new transaction endpoint needed (reconcile posts a normal
   create-transaction request).
4. **`packages/web`**:
   - Category pickers (`TransactionForm`'s category select,
     `CategoryFilterSelect`, budget category picker) filter out
     `isHidden` categories.
   - New "Reconcile balance" action + form (mobile: account detail sheet;
     desktop: account row/drawer action) — shows computed balance, actual
     balance input, computes and submits the signed transaction via the
     existing add-transaction mutation, defaulting `categoryId` to the
     correct hidden category based on sign.
   - Reports feature (whatever computes monthly income/expense/net totals
     and category breakdown) excludes transactions whose category is one of
     the two hidden `Balance Adjustment` categories.

## Verification

- Reconcile an account with actual < computed → expense transaction created
  under the hidden expense-side `Balance Adjustment` category, account
  balance now matches actual.
- Reconcile with actual > computed → income transaction created under the
  hidden income-side category.
- Reconcile with actual == computed → no transaction created.
- The two hidden categories do not appear in `TransactionForm`'s manual
  category picker, `CategoryFilterSelect`, or the budget category picker.
- Reports' monthly totals and category breakdown for a month containing an
  adjustment do not include the adjustment amount.
