# Transaction Running Balance — Plan

Produced via /grill-me interview. All decisions below were explicitly confirmed;
do not reinterpret or expand scope during implementation.

## Problem

The transaction list shows the amount of each transaction, but not the account
balance after that transaction. When reconciling cash, checking a bank app, or
debugging why an account balance drifted, the user has to mentally replay the
ledger from the opening balance. That is slow and error-prone.

## Goals

- Show the account's remaining balance after each transaction row.
- Compute the balance on the backend at read time, not by storing a denormalized
  balance on transactions.
- Make same-day transaction ordering explicit by adding transaction time.
- Keep the value stable regardless of active UI filters.

## Non-Goals

- No stored `balance_after` column on `transactions`.
- No separate reconciliation/adjustment flow; that belongs to the
  `balance-adjustment` spec.
- No destination-account balance display on transfer rows in v1.
- No transaction form preview of future balances while editing.
- No pagination or large-ledger optimization beyond the current personal-scale
  query shape.

## Product Decisions

- **Balance meaning**: `balanceAfter` means the post-transaction computed
  balance for `transaction.accountId`. It is account-specific, not a filtered
  running subtotal.
- **Filter independence**: `balanceAfter` must not change when the user filters
  by category/search/type/account. Filters decide which rows are visible; they
  do not change the ledger math attached to a row.
- **Backend-owned calculation**: `GET /transactions` and
  `GET /transactions?month=YYYY-MM` return transactions with response-only
  `balanceAfter?: number`.
- **No denormalization**: create/update/delete do not write any balance field.
  Editing or deleting an old transaction naturally changes later balances
  because the list response recomputes at read time.
- **Ledger order**: calculate oldest-to-newest by
  `tx_date ASC -> tx_time ASC -> created_at ASC -> id ASC`. Existing legacy
  rows with `tx_time = null` fall back to `created_at` within the same date;
  implementation must keep ordering deterministic.
- **Display order**: the UI may continue showing newest first, but each row's
  `balanceAfter` is computed from oldest-to-newest ledger order.
- **Transfers**: a transfer mutates both source and destination account running
  balances internally. The row's exposed `balanceAfter` is the source account's
  balance after the transfer, because `accountId` is the account shown on the
  row. Destination balance is not shown in list rows for v1.
- **UI placement**: display balance below the amount on both desktop and
  mobile. Do not add a new desktop table column.
- **Transaction time prerequisite**: transactions gain nullable `tx_time` in
  the database and optional `time` in the app model. New manual transactions
  default to the user's current local `HH:MM`; legacy rows and
  subscription-generated rows may have no time.

## Scope of Work

1. **`supabase/migrations/`**:
   - Add nullable `tx_time time` to `transactions`.
2. **`packages/shared` time support**:
   - `dtos/common.dto.ts` — add reusable local `HH:MM` validation.
   - `dtos/transaction.dto.ts` — add nullable/optional row, create, and patch
     time fields.
   - `models/transaction.model.ts` — add optional `time`.
   - `mappers/transaction.mapper.ts` — map `tx_time` row↔model and patch
     payloads.
   - `database.types.ts` — add `tx_time` to `transactions` Row/Insert/Update.
3. **`packages/web` time support**:
   - `features/transactions/components/TransactionForm.tsx` — add native
     time input, defaulting new rows to current local time and preserving blank
     time for legacy rows.
   - `features/transactions/components/DesktopTransactionsTable.tsx` — show
     stored time under the date when present.
   - `features/transactions/components/TransactionRow.tsx` — show stored time
     in mobile row metadata when present.
   - `core/i18n.tsx` — add `form.time` in vi/en.
4. **`packages/shared` balance response model**:
   - `models/transaction.model.ts` / DTO layer — add response-only
     `balanceAfter?: number` to the transaction model returned to the web
     app. Create/update schemas must not accept it.
5. **`packages/api` balance calculation**:
   - `features/transactions/repository.ts` — fetch accounts needed for opening
     balances, and fetch enough transactions to compute balances for every
     returned row:
     - no `month`: all user transactions.
     - with `month`: all user transactions through the month end, then return
       only rows in the requested month.
   - `features/transactions/service.ts` — compute account running balances in
     ledger order and attach `balanceAfter` to returned rows.
   - Keep create/update/delete behavior unchanged except existing query
     invalidation/refetch causes recalculated balances.
   - `features/subscriptions/repository.ts` — keep subscription logged rows
     valid when `tx_time` is null.
6. **`packages/web` balance display**:
   - `features/transactions/components/DesktopTransactionsTable.tsx` — render
     `balanceAfter` below the amount in muted tabular text.
   - `features/transactions/components/TransactionRow.tsx` — render
     `balanceAfter` below the amount in muted tabular text on mobile.
   - `core/i18n.tsx` — add a compact row label if needed, e.g. `tx.balanceAfter`.

## Verification

- Create a transaction with a time; reload the month; the row still shows the
  selected time.
- Edit a transaction's date/time/amount; later rows' balances are recalculated
  after refetch.
- Delete a transaction; later rows' balances are recalculated after refetch.
- Multiple same-day transactions order by time for balance calculation.
- Multiple same-day transactions with no time still have deterministic
  balances via `created_at`/`id`.
- A transfer row's visible `balanceAfter` is the source account's balance after
  the transfer; later destination-account rows still account for the incoming
  transfer internally.
- Desktop and mobile both show the remaining balance below the amount, with no
  additional desktop column.
- Active category/search/type/account filters do not change the balance shown
  for a given transaction.

## Open Items

- None. Cosmetic label wording for the balance subline can be chosen during
  implementation as long as it stays compact and localized.
