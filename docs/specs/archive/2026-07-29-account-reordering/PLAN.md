# Account Reordering — Plan

Produced via `/grill-with-docs`. All product decisions below were explicitly confirmed.

## Goal

Let each User define one persistent Account order that is respected everywhere Accounts are listed or selected.

## Current State

- Active Accounts are returned in creation order.
- Account lists and selectors consume that API order.
- Create forms already treat the first Account as the default in several flows.
- Money remains whole Vietnamese Đồng displayed as `1.234.567 ₫`; no formatting preference is needed.

## Decisions

- **One global order**: Account order is User-owned and shared by every app surface, not configured per page.
- **Order drives defaults**: the first eligible Account is the default for new Transactions, Subscriptions, and personal-loan cash flows; Transfers default from first to second.
- **New Accounts append**: a newly created Account is placed last.
- **Accessible reordering**: support pointer/touch drag-and-drop plus keyboard-accessible move up/down actions.
- **Active Accounts only**: archived Accounts are excluded from reordering and remain hidden from active selectors.
- **Formatting unchanged**: remove currency-format and per-locale number-format preferences from this backlog scope.

## Persistence and API

1. Add a persistent display-order field to `accounts` and backfill each User's existing Accounts by `created_at`, then `id` for deterministic ties.
2. Make Account creation append after the User's current maximum order.
3. Return active Accounts ordered by display order with a deterministic fallback.
4. Add one authenticated reorder operation that accepts the complete ordered active Account ID list, rejects missing/foreign/duplicate IDs, and updates the order atomically.
5. Keep Account ownership filtering unchanged and add cross-User reorder rejection tests.

## Web Changes

1. Add an Account-order mutation to the existing Accounts data layer with optimistic cache ordering and rollback on error.
2. Add reorder affordances to both `DesktopAccounts` and `MobileAccounts`; reuse one sortable list behavior rather than duplicating ordering logic.
3. Preserve focus and announce completed keyboard moves for assistive technology.
4. Ensure `AccountList`, `AccountSelect`, Transaction, Subscription, and personal-loan forms consume the shared ordered Accounts without local re-sorting.
5. Keep form defaults derived from the ordered eligible Account list.

## Verification

- Existing Accounts retain their prior creation order after migration.
- Dragging or moving an Account updates desktop, mobile, selectors, and create-form defaults after refetch/sign-in.
- New Accounts appear last.
- Reorder requests containing another User's Account, duplicates, omissions, or archived Accounts are rejected without partial changes.
- Failed reorder mutations roll the visible order back.
- Keyboard-only Users can reorder Accounts and receive an announcement.

## Explicitly Out of Scope

- Multiple Account groups or per-screen ordering.
- Reordering archived Accounts or adding unarchive behavior.
- Multi-currency support.
- Currency, symbol-placement, or locale-specific number-format preferences.

## Open Items

None.
