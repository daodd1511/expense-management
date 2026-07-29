# Budget Scope — Plan

Produced via `/grill-me`. Resolves the rollup semantics of a budget placed on a
parent category, which were never decided.

## Problem

`spentForCategory` (`packages/web/src/shared/lib/derive.ts`) matches
`t.categoryId === categoryId` exactly. A budget on a parent category therefore
counts only transactions logged **directly against that parent** — spending in
its subcategories is invisible to it. A user who sets a 5,000,000 ₫ budget on
Food and logs every meal under Restaurant and Coffee sees that budget sit at 0%.

`conflictsWithExistingBudget` (`packages/web/src/features/budgets/components/BudgetForm.tsx`)
then hides every other category in the branch, so the user cannot work around it
by budgeting the children instead of the parent. That exclusion rule is not a
product decision; it papers over the undecided semantics.

The missing fact is the user's intent: does this budget cover the category
alone, or the category and everything under it? Both are legitimate, and the
system cannot infer which.

## Goals

- Make a budget's coverage of subcategories an explicit, stored user choice.
- Guarantee every expense transaction counts toward at most one budget, so all
  budget aggregates remain plain sums.
- Compute budget spend through a single implementation shared by all consumers.
- Enforce the no-overlap invariant on the server, not only in the form.
- Deploy without changing any existing budget's displayed numbers.

## Non-Goals

- **No nested sub-limits.** "5M on Food, at most 1M of it on Coffee" is not
  expressible. A tree budget excludes child budgets outright.
- No server-computed `spent` field on budgets. Spend stays a client fold.
- No change to budget periodicity (still current-month-only), rollover, or
  alerts — see the separate backlog item.
- No change to the 2-level category nesting cap.
- No backfill of existing budgets to the new tree semantics.

## Domain Model

### Budget scope

A budget gains one field:

```text
Budget { categoryId, limit, scope: 'self' | 'tree' }
```

- `self` — spend counts transactions whose `categoryId` equals the budget's
  category.
- `tree` — spend counts transactions whose `categoryId` is the budget's category
  **or any of its children**.

Categories are capped at two levels, so `tree` never means more than a parent
plus its direct children. The implementation must still be written against
"descendants", not "direct children", so a future depth change does not silently
produce wrong totals.

### Coverage and conflict

```text
coverage(b) = { b.categoryId }                              if b.scope = 'self'
            = { b.categoryId } ∪ children(b.categoryId)     if b.scope = 'tree'
```

Two budgets **conflict** iff their coverage sets intersect. Concretely, for a
parent `P` and its child `C`:

| Existing | Candidate | Result |
| --- | --- | --- |
| `P` tree | `C` (any scope) | conflict |
| `C` (any scope) | `P` tree | conflict |
| `P` self | `C` (any scope) | allowed — disjoint |
| `C` (any scope) | `P` self | allowed — disjoint |
| `P` (any scope) | `P` | conflict — one budget per category |

The invariant this buys: **every expense transaction is covered by at most one
budget.** `totalSpent` and `totalLimit` on every screen stay plain sums with no
deduplication.

### Leaf categories

For a category with no children, `self` and `tree` produce identical spend. New
budgets on leaves store `tree`, so that adding a subcategory later keeps the
budget covering the whole branch rather than silently narrowing it — that silent
narrowing is the bug class this spec exists to remove.

## Persistence

`budgets` predates `supabase/migrations/` (baseline schema created out-of-band),
so this is an `alter table`:

```sql
alter table budgets
  add column scope text not null default 'self'
  check (scope in ('self', 'tree'));

alter table budgets
  add constraint budgets_owner_category_unique unique (owner_id, category_id);
```

The unique constraint is not incidental. `updateBudget` and `deleteBudget` in
`packages/api/src/features/budgets/repository.ts` already key on
`(owner_id, category_id)` and assume uniqueness the schema never enforced.

**No backfill.** Every existing row becomes `self`, which reproduces today's
behavior exactly. Nothing moves on deploy. The consequence, accepted
deliberately: a pre-existing budget on Food behaves differently from a new one
until the user edits it.

## Shared Code

The conflict rule now runs on both sides of the wire, so it moves out of the web
component into `packages/shared` — one implementation, not two that drift.

- `packages/shared/src/models/budget.model.ts` — add `scope` to `budgetSchema`.
- `packages/shared/src/dtos/budget.dto.ts` — add `scope` to `budgetRowSchema`
  and `budgetCreateSchema`; add `scope` to `budgetPatchSchema` (optional, since
  a patch may change limit alone).
- `packages/shared/src/mappers/budget.mapper.ts` — map `scope` both ways;
  `budgetPatchToRow` takes the patch object rather than a bare `limit`.
- New `packages/shared/src/lib/budget-coverage.ts` (or nearest existing home):
  `budgetCoverage(budget, categories)` and
  `conflictingBudget(candidate, budgets, categories, excludeCategoryId?)`,
  returning the offending budget or `null`.

`conflictsWithExistingBudget` is deleted from `BudgetForm.tsx`; its test file
moves alongside the shared implementation and is rewritten for the new rule.

## API

`packages/api/src/features/budgets/service.ts` gains the conflict check on both
create and update. It needs the user's categories — the categories repository is
already available in the API.

- `createBudget` — load categories, run `conflictingBudget`, throw
  `ApiError(409, 'Budget conflict')` when non-null.
- `updateBudget` — same check when the patch changes `scope`, excluding the
  budget being edited. A limit-only patch skips it.

`ApiError` carries a details payload; include the conflicting category id so the
web client can name it in the error message.

## Web

### Spend calculation

New `useBudgetSpend()` in `packages/web/src/features/budgets/queries.ts`:

```ts
/** Returns a resolver summing the current month's expenses covered by a budget. */
function useBudgetSpend(): (budget: Budget) => number
```

Built from `useTransactions()` (already month-scoped server-side) and
`useCategories()`. All four consumers switch to it:

- `features/budgets/components/BudgetBars.tsx`
- `features/budgets/components/MobileBudgets.tsx`
- `features/budgets/components/DesktopBudgets.tsx`
- `features/dashboard/components/MobilePlanningOverview.tsx`

`spentForCategory` keeps its signature and its non-budget callers, if any; it is
no longer used by budgets.

### Form

`BudgetForm.tsx`:

- The picker excludes categories covered by an existing budget — i.e. exact
  matches and descendants of a `tree` budget. A parent whose child is budgeted
  stays **selectable**, unlike today.
- A scope control renders only when the selected category has children. It
  defaults to `tree`.
- When the selected parent has a budgeted child, the `tree` option is disabled
  with a hint naming the child. The 409 from the API is a backstop, not the
  normal path.
- Edit mode keeps the category locked and shows the scope control under the same
  rules. Switching `self → tree` over a budgeted child is blocked in the UI and
  rejected by the API.
- Leaves submit `scope: 'tree'` with no control shown.

### Display

Budget rows show a muted `· incl. subcategories` suffix after the category name
when `scope === 'tree'` **and** the category has children — never on leaves,
where it would be noise. Applies to `BudgetBars`, `MobileBudgets`,
`DesktopBudgets`. `MobilePlanningOverview` shows only aggregates and needs no
suffix.

### i18n

New key pairs in both `VI` and `EN` (`packages/web/src/core/i18n.tsx`):

- `budget.scope` — the control's label
- `budget.scopeSelf` — "This category only"
- `budget.scopeTree` — "Include subcategories"
- `budget.scopeTreeBlocked` — hint naming the budgeted child
- `budget.inclSubcategories` — the list suffix
- `budget.conflict` — the 409 error message

## Decisions

1. **Scope is explicit, not inferred.** Inferring it from which children are
   budgeted would silently redefine a parent's meaning whenever a child budget
   is added or removed, and could not express "Food alone" while Coffee is
   unbudgeted.
2. **A tree budget excludes child budgets.** Allowing them as nested sub-limits
   is more expressive but forces every aggregate on four screens to deduplicate
   and the list UI to nest. Re-openable if sub-limits are ever wanted.
3. **Conflicts block; they never absorb.** Switching `self → tree` over a
   budgeted child errors rather than deleting the child budget behind a confirm
   dialog — deleting data from a screen the user is not editing.
4. **Enforced server-side.** The form filter is an affordance. The invariant is
   correctness-critical for spend attribution and a client-only rule is
   defeated by a second tab.
5. **Spend stays client-side.** A server-computed `spent` matches ADR-0004's
   direction but adds an aggregate query, a DTO field, and a
   transactions→budgets invalidation edge for data already sitting in cache.
   One shared hook gets the single-implementation benefit without that cost.
6. **No backfill.** Preserving displayed numbers on deploy beats guessing intent
   for a handful of rows the user can flip in seconds.
7. **Leaves store `tree`.** The alternative silently drops a new subcategory out
   of its parent's budget — the exact failure this spec removes.

No ADR: this decision lives and dies inside the budgets feature.

## Verification

### Coverage and conflict rule

- `self` budget spend counts only direct-to-category expenses.
- `tree` budget spend counts the category plus every child.
- Neither counts income, transfers, or other months.
- `tree` parent vs. child budget conflicts in both insertion orders.
- `self` parent and child budget do not conflict.
- Editing a budget excludes itself from the conflict check.
- A leaf's `self` and `tree` spend are equal.

### API

- `POST /api/budgets` with a conflicting scope returns 409 and creates nothing.
- `PATCH` changing `scope` into a conflict returns 409 and mutates nothing.
- `PATCH` changing only `limit` succeeds while a `self` parent and child budget
  coexist.
- The unique constraint rejects a second budget on the same category.

### Migration

- Applied against existing data, every row reads `scope = 'self'`.
- Every budget's displayed spend and percentage is unchanged from before the
  migration.

### UI

- Selecting a leaf shows no scope control; the created budget stores `tree`.
- Selecting a parent shows the control defaulting to `tree`.
- Selecting a parent whose child is budgeted disables the `tree` option and
  names the child.
- The picker omits a child whose parent holds a `tree` budget, and offers it
  when the parent holds a `self` budget.
- A `tree` budget on a parent with children shows the list suffix; a `tree`
  budget on a leaf does not.
- Totals on the budgets screen and the dashboard equal the plain sum of the
  rows, with a `self` parent and its children all budgeted.
