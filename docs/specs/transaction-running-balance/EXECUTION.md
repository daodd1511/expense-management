# Transaction Running Balance - Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` -> "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 2 — pending
- Phase 1 — Transaction time prerequisite: done
- Phase 2 — Backend balance calculation: pending
- Phase 3 — Frontend balance display: pending
- Verification debt: none

## Phase 1 - Transaction time prerequisite

Branch: `transaction-running-balance/phase-1-transaction-time` (off `develop`, stacked)

This phase established deterministic same-day ordering data before backend balance math depends on it. Completed in `66a3b7f`.

- [x] `supabase/migrations/20260707070000_add_transaction_time.sql` adds nullable `tx_time time` to `transactions`.
- [x] `packages/shared/src/dtos/common.dto.ts` adds reusable local `HH:MM` validation.
- [x] `packages/shared/src/dtos/transaction.dto.ts` adds nullable/optional `tx_time`/`time` fields for row, create, and patch schemas without accepting seconds.
- [x] `packages/shared/src/models/transaction.model.ts` adds optional `time`.
- [x] `packages/shared/src/mappers/transaction.mapper.ts` maps `tx_time` row->model and create/patch payloads.
- [x] `packages/shared/src/database.types.ts` adds `tx_time` to `transactions` Row/Insert/Update.
- [x] `packages/api/src/features/subscriptions/repository.ts` keeps subscription generated rows valid with `tx_time: null`.
- [x] `packages/web/src/features/transactions/components/TransactionForm.tsx` adds time selection, defaults new rows to current local `HH:MM`, and preserves blank time for legacy rows.
- [x] `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx` shows stored time under the date when present.
- [x] `packages/web/src/features/transactions/components/TransactionRow.tsx` shows stored time in mobile row metadata when present.
- [x] `packages/web/src/core/i18n.tsx` adds `form.time`, `form.timeHour`, and `form.timeMinute` in vi/en.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/shared test -- transaction.dto`
- [x] `pnpm --filter @wallet/web test -- TransactionForm TransactionRow`
- [x] `pnpm --filter @wallet/api test -- transactions subscriptions`
- [x] `pnpm typecheck`

**Review checklist (user, at PR review):**
- [ ] Create a transaction with a time; reload the month; the row still shows the selected time.
- [ ] Confirm legacy/subscription rows without time still render without empty punctuation or layout gaps.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 - Backend balance calculation

Branch: `transaction-running-balance/phase-2-backend-balance` (off `develop`, stacked - phase 1 already landed in `66a3b7f`)

This phase owns the backend and shared response contract so every returned transaction can carry a stable account-specific `balanceAfter` before the UI tries to display it.

- [ ] `packages/shared/src/models/transaction.model.ts` adds response-only `balanceAfter?: number` to `transactionSchema`.
- [ ] `packages/shared/src/dtos/transaction.dto.ts` adds `balanceAfter?: number` only to response/model validation where needed; `transactionCreateSchema` and `transactionPatchSchema` must not accept it.
- [ ] `packages/shared/src/mappers/transaction.mapper.ts` preserves `balanceAfter` when mapping validated response rows/models and does not write any balance field in `fromTransaction` or `transactionPatchToRow`.
- [ ] `packages/shared/src/finance.ts` adds or reuses pure ledger helpers for per-account running balances, including income, expense, source-account transfer debit, and destination-account transfer credit.
- [ ] `packages/shared/src/finance.test.ts` covers account-specific `balanceAfter`, same-day `time` ordering, null-time fallback behavior, and transfer source/destination balance effects.
- [ ] `packages/api/src/features/transactions/repository.ts` fetches the account opening balances needed for the requesting user.
- [ ] `packages/api/src/features/transactions/repository.ts` fetches enough user transactions for balance calculation: all rows for no `month`, and all rows through the requested month end for `month=YYYY-MM`.
- [ ] `packages/api/src/features/transactions/repository.ts` orders ledger input deterministically by `tx_date ASC`, `tx_time ASC` with null-time fallback to `created_at`, then `created_at ASC`, then `id ASC`, while preserving the current newest-first display return order.
- [ ] `packages/api/src/features/transactions/service.ts` computes account running balances in ledger order and attaches each visible row's source-account `balanceAfter`.
- [ ] `packages/api/src/features/transactions/service.ts` returns only requested-month rows when `month=YYYY-MM`, but calculates their balances from all prior same-user rows through the month end.
- [ ] `packages/api/src/features/transactions/service.ts` leaves create/update/delete behavior unchanged; recalculation happens on the next list read after existing invalidation/refetch.
- [ ] `packages/api/src/features/transactions/transactions.test.ts` covers unfiltered list balances, month-filtered balances that include prior history, edit/delete recalculation via list refetch, same-day time ordering, null-time deterministic fallback, and transfer source/destination effects.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/shared test -- finance transaction.dto`
- [ ] `pnpm --filter @wallet/api test -- transactions`
- [ ] `pnpm --filter @wallet/api typecheck`
- [ ] `pnpm typecheck`

**Review checklist (user, at PR review):**
- [ ] Inspect API response examples for `GET /transactions` and `GET /transactions?month=YYYY-MM`; each returned transaction includes account-specific `balanceAfter`.
- [ ] Confirm active category/search/type/account filters do not change the `balanceAfter` value for the same transaction row after refetch.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 3 - Frontend balance display

Branch: `transaction-running-balance/phase-3-frontend-display` (off `transaction-running-balance/phase-2-backend-balance`, stacked)

This phase is display-only and depends on Phase 2 exposing `balanceAfter` in the transaction model.

- [ ] `packages/web/src/core/types.ts` or the shared transaction import path used by the web app accepts `balanceAfter?: number` from the API response.
- [ ] `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx` renders `balanceAfter` below the amount in muted tabular text and does not add a new desktop table column.
- [ ] `packages/web/src/features/transactions/components/TransactionRow.tsx` renders `balanceAfter` below the amount in muted tabular text on mobile.
- [ ] `packages/web/src/core/i18n.tsx` adds a compact localized balance subline label if needed, such as `tx.balanceAfter`.
- [ ] `packages/web/src/features/transactions/components/TransactionRow.test.tsx` covers mobile balance subline rendering for income, expense, and transfer rows.
- [ ] Add or extend the closest desktop transaction table test for `DesktopTransactionsTable.tsx`; if no harness exists, create a focused component test that verifies the amount cell shows the balance subline without changing column count.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web test -- TransactionRow DesktopTransactionsTable`
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm typecheck`

**Review checklist (user, at PR review):**
- [ ] Desktop shows remaining balance below the amount with no extra table column.
- [ ] Mobile shows remaining balance below the amount and preserves the existing task-management visual density.
- [ ] Deleting or editing an older transaction causes later visible row balances to update after the transaction query refetches.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.
