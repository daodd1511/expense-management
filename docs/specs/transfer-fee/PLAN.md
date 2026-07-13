# Transfer Fee — Plan

Produced via /grill-me interview. All decisions below were explicitly confirmed;
do not reinterpret or expand scope during implementation. Depends on the
`isHidden` category field introduced by [balance-adjustment](../balance-adjustment/PLAN.md)
— check whether that has landed before starting; if not, this spec's Scope of
Work includes adding `isHidden` itself (don't build it twice).

## Problem

Transfers (`Transaction.type === 'transfer'`, `accountId` → `toAccountId`) move
the exact same amount out of the source and into the destination. Real-world
transfers — e.g. an ATM withdrawal — often cost extra: the source account is
debited more than the destination receives, because a fee is deducted. There's
no way to record that today without manually creating a second, disconnected
expense transaction.

## Goals

- Optional fee on a transfer: source account is debited `amount + fee`,
  destination account receives the full `amount` typed.
- The fee is real spending — it should show up in Reports' expense totals and
  category breakdown (unlike a balance adjustment, which is a correction, not
  spending).
- The fee transaction and its parent transfer stay linked: deleting the
  transfer cascades to delete the fee.

## Non-Goals

- No fee on account-opening or non-transfer transaction types.
- No change to `computeBalance`'s transfer logic itself — the transfer moves
  `amount` as it always has; the fee is a separate expense transaction on the
  source account, not a new arithmetic path.
- No editing UI for the fee independent of editing the transfer amount (see
  Judgment Calls).

## Product Decisions

- **Direction**: source account is debited `amount + fee`; destination is
  credited `amount` (the full amount typed is what arrives — matches an ATM
  withdrawal, not a wire-transfer-style fee).
- **Entry**: optional "Fee" amount field on the existing transfer form
  (`TransactionOverlay`, `type: 'transfer'`). Blank/zero = no fee, no extra
  transaction created — existing transfer behavior is fully preserved when
  unset.
- **Representation**: when fee > 0, creates two transactions atomically:
  1. The transfer itself (`type: 'transfer'`, `accountId` → `toAccountId`,
     `amount` as typed — destination receives this in full).
  2. A linked expense transaction: `type: 'expense'`, `accountId` = the
     transfer's source account, `amount` = fee, `categoryId` = a new hidden
     system category `Transfer Fee` (expense-type only — a fee is always a
     loss, never a gain).
- **Linking**: the fee expense transaction stores a back-reference to its
  parent transfer, mirroring the existing `Transaction.subscriptionId`
  pattern (a new field, e.g. `linkedTransferId`, nullable, only set on
  fee-expense rows).
- **Cascade delete**: deleting the transfer transaction also deletes its
  linked fee expense transaction (fee only exists because the transfer
  happened).
- **Reports**: `Transfer Fee` is a normal (non-hidden-from-reports) expense
  category — it counts toward expense totals and appears in the category
  breakdown, same as any real spending category. Only its _picker_
  visibility is hidden (see below), not its reporting visibility.
- **Category picker visibility**: `Transfer Fee` is seeded with
  `isHidden: true` (same mechanism as `balance-adjustment`'s hidden
  categories) so it can't be manually mis-applied to an unrelated expense —
  it's system-generated only, attached exclusively by the transfer-with-fee
  flow.

## Judgment Calls (not asked, noted here)

- Editing a transfer that has a linked fee: if the fee amount is edited, the
  linked expense transaction's amount updates to match; if the transfer
  itself is edited (amount/accounts/date), the linked fee transaction's
  `accountId`/`date` follow the transfer's source account/date to stay
  consistent — this is the same "linked, kept in sync" contract the
  cascade-delete decision already established, not a separate one worth a
  question.
- `Transfer Fee` seeded as a single top-level system category (not nested
  under an existing parent like "Bills") — it's a distinct enough concept
  that forcing it under an unrelated parent would be more confusing than
  leaving it flat.
- Icon/color: distinct from real spending categories, cosmetic choice at
  implementation time.

## Scope of Work

1. **`packages/shared`**:
   - `models/transaction.model.ts` — add `linkedTransferId: z.string().nullable().optional()`
     to `transactionSchema` (mirrors `subscriptionId`'s shape).
   - `mappers/transaction.mapper.ts` — map `linkedTransferId` row↔model.
   - If not already landed by `balance-adjustment`: add `isHidden` to
     `category.model.ts`/`category.mapper.ts` (see header note — don't
     duplicate).
2. **`supabase/migrations/`**: new migration —
   - Add `linked_transfer_id` nullable FK column to the transactions table
     (references transactions.id, `on delete cascade` from the transfer's
     side — deleting the transfer row deletes rows that reference it via
     this column).
   - Seed one system category: `Transfer Fee` (expense, `isHidden: true`).
   - If not already landed by `balance-adjustment`: add `is_hidden` column
     to categories table.
3. **`packages/api`** (`features/transactions`):
   - `service.ts` — creating a transfer with `fee > 0` creates both rows
     (transfer + linked fee expense) in one operation; deleting a transfer
     also deletes rows where `linkedTransferId` matches (or relies on the DB
     cascade from step 2 — decide which layer owns this at implementation
     time, prefer DB cascade for atomicity).
   - `controller.ts`/DTO validation — accept an optional `fee` field on the
     transfer create request.
4. **`packages/web`**:
   - Transfer form (`TransactionOverlay`, `type: 'transfer'`) — optional
     "Fee" amount input.
   - Category pickers — exclude `isHidden` categories (shared work with
     `balance-adjustment`, don't duplicate the filter logic).
   - Reports — `Transfer Fee` is NOT excluded from totals/breakdown (only
     `Balance Adjustment` categories are); verify this explicitly since it's
     the opposite exclusion rule from the sibling spec.

## Verification

- Create a transfer with a fee: source account balance drops by
  `amount + fee`, destination account balance rises by exactly `amount`.
- The fee shows as a separate expense transaction under `Transfer Fee`,
  linked to the transfer.
- Deleting the transfer also removes the linked fee expense transaction;
  both account balances reflect the full reversal.
- Creating a transfer with no fee (blank/zero) behaves exactly as it does
  today — no second transaction, no `Transfer Fee` category involved.
- `Transfer Fee` does not appear in the manual category picker but DOES
  appear in Reports' expense totals and category breakdown for a month
  containing one.
