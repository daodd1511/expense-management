# Account Reordering — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 2 — done
- Phase 1 — Persistence and API: done
- Phase 2 — Web reordering: done
- Verification debt: none

## Phase 1 — Persistence and API

Branch: `account-reordering/phase-1-persistence-api` (off `develop`, stacked)

This phase establishes the persistent order and authenticated atomic mutation consumed by the web phase.

- [x] Add `supabase/migrations/20260716000000_account_display_order.sql` with `accounts.display_order`, deterministic per-User backfill by `created_at` then `id`, append-on-create behavior, supporting index, and an atomic `reorder_accounts` RPC that accepts exactly the User's active Account IDs.
- [x] Update `packages/shared/src/models/account.model.ts`, `dtos/account.dto.ts`, `mappers/account.mapper.ts`, `database.types.ts`, and `index.ts` for `displayOrder`, the complete-order request, and the RPC; add `mappers/account.mapper.test.ts`.
- [x] Update `packages/api/src/features/accounts/{schema,routes,controller,service,repository}.ts` with `PUT /accounts/order`, ordered reads, append-on-create handling, and ownership/duplicate/omission/archived validation through the atomic RPC.
- [x] Extend `packages/api/src/features/accounts/accounts.test.ts` for deterministic reads, appended creation, valid reorder, rejected incomplete/duplicate/foreign/archived IDs, and zero partial updates.
- [x] (amended 2026-07-16) Use `AccountCreate` instead of `Omit<Account, ...>` in `packages/web/src/features/accounts/{db,queries}.ts` and `{AccountForm,DesktopAccounts,MobileAccounts}.tsx`; add `displayOrder` to typed fixtures in `core/data.ts`, Account form/reconciliation tests, and `RepaymentForm.test.tsx`.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck && pnpm --filter @wallet/web typecheck` (the shared Account contract is consumed by both packages)
- [x] (amended 2026-07-16: corrected runner filtering) `pnpm --filter @wallet/shared exec vitest run src/mappers/account.mapper.test.ts && pnpm --filter @wallet/api exec vitest run src/features/accounts/accounts.test.ts`

**Review checklist (user, at PR review):**
- [ ] Existing Accounts retain their creation order after migration/refetch, and a newly created Account appears last.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Web reordering

Branch: `account-reordering/phase-2-web-reordering` (off `account-reordering/phase-1-persistence-api`, stacked)

This phase consumes the stable API contract and delivers one shared accessible ordering behavior across both layouts.

- [x] Add `reorderAccounts` in `packages/web/src/features/accounts/db.ts` and `useReorderAccounts` in `queries.ts` with optimistic `['accounts', userId]` ordering, rollback, and authoritative invalidation; cover it in new `queries.test.tsx`.
- [x] Add reusable pointer/touch and keyboard ordering behavior in `packages/web/src/features/accounts/components/AccountReorderList.tsx`, with focus preservation and live announcements; cover it in `AccountReorderList.test.tsx` and add Vietnamese/English copy in `packages/web/src/core/i18n.tsx`.
- [x] Integrate `AccountReorderList` into `DesktopAccounts.tsx` and `MobileAccounts.tsx` without duplicating ordering state or disturbing existing edit, reconcile, delete, swipe, and transaction-navigation actions.
- [x] Keep API order unchanged through `AccountList.tsx` and `AccountSelect.tsx`; update `TransactionForm.tsx`, `SubscriptionForm.tsx`, `LoanForm.tsx`, `OriginForm.tsx`, and `RepaymentForm.tsx` so ordered Accounts drive first-Account defaults and Transfers use first-to-second, with focused component tests.
- [x] (amended 2026-07-16 from review) Replace inline reorder controls with explicit desktop `Modal` and mobile `BottomSheet` reorder flows; use current `@dnd-kit/react` sortable rows with Account names, drag handles, keyboard support, and animated movement, then update focused tests.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] (amended 2026-07-16: corrected runner filtering) `pnpm --filter @wallet/web exec vitest run src/features/accounts/queries.test.tsx src/features/accounts/components/AccountReorderList.test.tsx src/features/transactions/components/TransactionForm.test.tsx src/features/subscriptions/components/SubscriptionForm.test.tsx src/features/loans/components/LoanForm.test.tsx src/features/loans/components/OriginForm.test.tsx src/features/loans/components/RepaymentForm.test.tsx`
- [x] (amended 2026-07-16 from review) `pnpm --filter @wallet/web typecheck`
- [x] (amended 2026-07-16 from review) `pnpm --filter @wallet/web exec vitest run src/features/accounts/queries.test.tsx src/features/accounts/components/AccountReorderList.test.tsx src/features/accounts/components/AccountReorderControl.test.tsx`
- [x] (amended 2026-07-16 from review) `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] Reorder Accounts by pointer on desktop and touch on mobile; refetch/sign in again and confirm every list and selector keeps the same order.
- [ ] Reorder using only move up/down controls; confirm focus and announcement, then confirm Transaction, Subscription, and loan cash-flow defaults use the new first Account and Transfers use the first two.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
