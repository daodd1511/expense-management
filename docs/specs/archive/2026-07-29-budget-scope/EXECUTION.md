# Budget Scope — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: All phases complete
- Phase 1 — Schema, shared model, API: done
- Phase 2 — Web spend, form, display: done
- Verification debt: none

## Phase 1 — Schema, shared model, API

Branch: `budget-scope/phase-1-schema-api` (off `develop`)

Nothing downstream can start until `scope` exists on the row, the model, and the wire.
Ships alone safely — `default 'self'` reproduces today's behavior.

- [x] New migration `supabase/migrations/20260727233114_budget_scope.sql`: add `scope text not null default 'self' check (scope in ('self','tree'))` and `unique (owner_id, category_id)` on `budgets` (per PLAN.md → "Persistence"). No backfill.
- [x] Regenerate `packages/shared/src/database.types.ts` for the new column. (Supabase CLI unavailable in this environment — hand-edited to match the migration instead of running `supabase gen types`.)
- [x] `packages/shared/src/models/budget.model.ts`: add `scope` to `budgetSchema`.
- [x] `packages/shared/src/dtos/budget.dto.ts`: add `scope` to `budgetRowSchema` and `budgetCreateSchema`; add optional `scope` to `budgetPatchSchema`.
- [x] `packages/shared/src/mappers/budget.mapper.ts`: map `scope` in `toBudget`/`fromBudget`; change `budgetPatchToRow` to take the patch object instead of a bare `limit`.
- [x] New `packages/shared/src/budget-coverage.ts` — `budgetCoverage(budget, categories)` and `conflictingBudget(candidate, budgets, categories, excludeCategoryId?)` returning the offending budget or `null` (per PLAN.md → "Domain Model"). Flat file mirroring `finance.ts`; shared has no `lib/` dir. Written against descendants, not direct children.
- [x] New `packages/shared/src/budget-coverage.test.ts` covering PLAN.md → "Verification / Coverage and conflict rule".
- [x] Export the new schemas, types, and coverage helpers from `packages/shared/src/index.ts`.
- [x] `packages/api/src/features/budgets/repository.ts`: pass the patch through to `budgetPatchToRow`; adjust `updateBudget` signature.
- [x] `packages/api/src/features/budgets/service.ts`: load categories via `categories/service.listCategories(userId)` (service-to-service, matching layering elsewhere in the API), run `conflictingBudget` on `createBudget`, and on `updateBudget` when the patch changes `scope`. Throw `ApiError(409, ...)` with the conflicting category id in details. A limit-only patch skips the check.
- [x] New `packages/api/src/features/budgets/budgets.test.ts` covering PLAN.md → "Verification / API" (mirror `categories/categories.test.ts` for setup).
- [x] (amended 2026-07-27) `packages/web/src/core/data.ts`: add `scope: "tree"` to each seed budget literal — required now that `scope` is non-optional on `Budget`; minimal fix to keep the shared model change compiling, not real feature work (phase 2 owns the actual toggle/picker/display).
- [x] (amended 2026-07-27) `packages/web/src/features/budgets/components/BudgetForm.tsx`: pass `scope: "self"` in the `submit()` call at line 60 as a placeholder — reproduces today's exact behavior (no scope UI exists yet) until phase 2 replaces this call site with the real form control.
- [x] (amended 2026-07-27) `packages/web/src/features/budgets/components/BudgetForm.test.ts`: add `scope: "self"` to the `Budget` literals in the existing `conflictsWithExistingBudget` tests so they keep compiling; this file and its subject are superseded wholesale by phase 2's shared coverage test, not otherwise touched here.

**Agent gate (hard):**
- [x] `pnpm typecheck` (project-wide, unscoped — this phase changes an exported shared model)
- [x] `pnpm test` (full local suite; escalated per rulebook because `budgetSchema`/`budgetPatchToRow` are shared surfaces whose consumers carry no reliable import edge)
- [x] `pnpm build`
- [x] CI green on the phase PR

**Review checklist (user, at PR review):**
- [ ] Migration applied against existing data: every budget row reads `scope = 'self'` and every budget's displayed spend/percentage is unchanged from before.
- [ ] `GET /api/budgets` returns `scope` on every budget.

## Phase 2 — Web spend, form, display

Branch: `budget-scope/phase-2-web-ui` (off `budget-scope/phase-1-schema-api`, stacked)

Everything the user sees, in one phase: the rollup, the control that sets it, and the label
that explains it. Splitting the form from the display would ship a scope the user can set
but cannot see.

- [x] `packages/web/src/features/budgets/queries.ts`: add `useBudgetSpend()` returning `(budget: Budget) => number`, built on `useTransactions()` + `useCategories()` and `budgetCoverage` from shared.
- [x] (amended 2026-07-27) `packages/web/src/features/budgets/db.ts` + `queries.ts`'s `useUpdateBudget`: PLAN.md's "editable scope" decision requires PATCH to carry `scope`, not just `limit` — `updateBudget(categoryId, limit)` becomes `updateBudget(categoryId, patch: BudgetPatch)`. Not called out in the original checklist; required for the edit-form scope toggle to reach the API at all.
- [x] Switch to `useBudgetSpend()` in `features/budgets/components/BudgetBars.tsx`, `MobileBudgets.tsx`, `DesktopBudgets.tsx`, and `features/dashboard/components/MobilePlanningOverview.tsx`. Leave `spentForCategory` in `shared/lib/derive.ts` for any non-budget caller.
- [x] `features/budgets/components/BudgetForm.tsx`: delete `conflictsWithExistingBudget`, use shared `conflictingBudget`; picker excludes only exact matches and descendants of a `tree` budget, so a parent with a budgeted child stays selectable.
- [x] `BudgetForm.tsx`: scope control rendered only when the selected category has children, defaulting to `tree`; `tree` disabled with a hint naming the child when a child is budgeted; leaves submit `scope: 'tree'` with no control. Edit mode keeps the category locked and shows the control under the same rules.
- [x] `BudgetForm.tsx`: surface the API 409 through the existing `FormErrorBanner` path. (Wrapped `onSubmit` to reshape a 409 `ApiError` into the `fieldErrors` shape `getFieldErrorMessage` already knows how to read, rather than changing that shared helper.)
- [x] Delete `features/budgets/components/BudgetForm.test.ts` — superseded by the shared coverage test from phase 1.
- [x] Muted `· incl. subcategories` suffix in `BudgetBars.tsx`, `MobileBudgets.tsx`, `DesktopBudgets.tsx`, shown only when `scope === 'tree'` **and** the category has children. (Done via a shared `coversSubcategories()` helper exported from `BudgetBars.tsx` and reused by the other two, rather than duplicating the condition three times.)
- [x] `packages/web/src/core/i18n.tsx`: add `budget.scope`, `budget.scopeSelf`, `budget.scopeTree`, `budget.scopeTreeBlocked`, `budget.inclSubcategories`, `budget.conflict` to both `VI` and `EN`.

**Agent gate (hard):**
- [x] `pnpm typecheck` (project-wide, unscoped)
- [x] `pnpm test` (full local suite; this phase consumes the shared budget surfaces changed in phase 1)
- [x] `pnpm build`
- [x] CI green on the phase PR

**Review checklist (user, at PR review):**
- [ ] Selecting a leaf shows no scope control; the created budget covers that category.
- [ ] Selecting a parent shows the control defaulting to "include subcategories"; its spend counts child transactions.
- [ ] Switching that budget to "this category only" drops the child spend from the bar.
- [ ] With a `self` budget on the parent, the child is still offered in the picker; with a `tree` budget, it is not.
- [ ] Selecting a parent whose child is budgeted disables the `tree` option and names the child.
- [ ] The list suffix appears on a `tree` parent budget and never on a leaf budget.
- [ ] Budgets-screen and dashboard totals equal the plain sum of the visible rows, with a `self` parent and both its children budgeted.
- [ ] Mobile and desktop both check out (the two layouts render budget rows separately).

**On completion (both phases):** run the local agent gate, update STATUS + checkboxes, stop
and ask before push/PR; after the PR opens, watch CI and fix red before marking the phase
done. Review checklist goes into the PR description.
