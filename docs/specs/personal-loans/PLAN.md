# Personal Loans — Plan

Produced via `/grill-with-docs`. All product decisions below were explicitly
confirmed; do not reinterpret or expand scope during implementation. Canonical
terms live in [`CONTEXT.md`](../../../CONTEXT.md), and the cross-cutting ledger
invariant is recorded in
[ADR 0006](../../adr/0006-loan-events-own-linked-transactions.md).

## Problem

The app can track money held in accounts but cannot represent money directly
lent to or borrowed from another person. Recording those movements as expenses
or income corrupts spending, earnings, budgets, savings rate, and reports;
omitting them makes account balances wrong and loses repayment history.

The feature must keep three views consistent:

1. Account balances and transaction history — where money moved.
2. Personal-loan balances — who owes whom and how much remains.
3. Net worth and reports — cash plus receivables minus liabilities, reconciled
   without treating principal as income or spending.

## Goals

- Track direct person-to-person lending and borrowing funded through any
  existing account (cash, bank, card, or e-wallet).
- Keep one reusable Person record across their separate loans.
- Support one initial disbursement per new loan and multiple partial repayments.
- Support opening loans that predate feature adoption without fabricating an
  account transaction.
- Keep loan events and linked account transactions atomic and impossible to
  edit independently.
- Show loan movements in transaction history and reporting without including
  principal in income, expenses, budgets, savings rate, or spending analytics.
- Include outstanding lending and borrowing in current and historical net
  worth.
- Provide responsive Loans pages, dashboard summaries, due-state visibility,
  and complete account-total/net-worth reconciliations.

## Non-Goals

- Interest, fees, accrual, compounding, or payment-allocation rules.
- Installment schedules or recurring repayment plans.
- Loans from banks, credit-card issuers, or other formal lenders.
- Paid-on-behalf IOUs, shared-expense splitting, or group debts.
- Push, email, or operating-system notifications.
- Address-book sync, phone numbers, email addresses, or identity matching.
- Attachments, contracts, receipts, or loan documents.
- Multiple currencies; all amounts remain whole Vietnamese đồng.
- Household/shared loan ownership.

## Domain Rules

### People and loan identity

- A Person has a required display name and optional note only.
- A Person is reusable across all of their loans. Names are not globally or
  per-user unique because two people may legitimately share a name.
- A Person cannot be deleted while any loan, including closed history,
  references them. The user may rename the Person or delete erroneous loans
  first.
- Each loan has one Person, one immutable direction (`lending` or `borrowing`),
  and an optional description.
- Opposite-direction loans with the same Person remain separate. Person-level
  gross totals and net position are derived summaries and never merge loans.
- Every new disbursement creates a new loan. Adding money never enlarges an
  existing loan.

### Origins

A loan has exactly one origin event:

- **Disbursement** — a current or historical direct money transfer. It creates
  one loan-linked account transaction.
- **Opening balance** — the outstanding amount when tracking begins. It has a
  required balance-as-of local date (default today), optional original loan
  date, and no account transaction or loan cash flow.

For a disbursed loan, the origin amount is its immutable conceptual principal;
the user may correct the amount through the Loans page. For an opening loan,
the origin amount is the outstanding balance as of tracking start; unknown
earlier disbursements and repayments are not reconstructed.

### Repayments and outstanding balance

- A loan supports zero or more partial repayments.
- Each repayment may use any active account, independent of the origin account.
- Repayment amount must be positive and no greater than the outstanding
  balance at that event.
- Outstanding balance is the origin amount minus repayments, until a write-off
  or forgiveness closes the remainder.
- An exact final repayment derives `repaid`; there is no manually selected
  repaid status.
- Repayments are editable and deletable only from loan detail. The linked
  transaction changes atomically, and removing a final repayment reopens the
  loan.
- V1 has no overpayment. Any excess returned by the other person is recorded
  separately as ordinary income, outside the loan.

### Due dates and state

- A loan has one optional due local date; there is no installment schedule.
- `due soon` means open and due within the existing seven-day warning window.
- `overdue` means open with a due date before today.
- Status is derived from events:
  - `open`
  - `due-soon`
  - `overdue`
  - `repaid`
  - `written-off` (lending only)
  - `forgiven` (borrowing only)
- There is no generic cancelled or closed status.
- Write-off closes all remaining lending as a non-cash net-worth loss.
- Forgiveness closes all remaining borrowing as a non-cash net-worth gain.
- A write-off or forgiveness may be reopened as a correction, removing that
  closing event and restoring the prior outstanding balance.

### Editing and deletion

- Person, description, due date, and note are editable at any time.
- Origin amount, origin account, and origin date are editable through loan
  detail and update the linked transaction atomically. Origin amount cannot be
  reduced below total repayments.
- Direction is immutable. Correct a wrong direction by deleting and recreating
  the loan.
- A mistaken loan may be deleted after explicit confirmation. Deletion
  atomically removes the loan, all events, and every linked transaction.
- Deletion is data correction, never the workflow for nonpayment; use write-off
  or forgiveness for real-world closure.
- Earlier repayment events on a written-off or forgiven loan may be changed
  only after reopening it.

## Transaction Model

Loan principal must not be represented by hidden income/expense categories.
Categories have a fixed income/expense type and would require four special
categories while leaving the transaction semantically false and every report
dependent on category exclusions.

Extend the transaction model with:

- `type: 'loan'` in addition to `expense | income | transfer`.
- `cashFlowDirection: 'inflow' | 'outflow'` for `loan` only.
- `loanEventId` as a required unique link for `loan` and absent for all other
  transaction types.
- `categoryId: null` and `toAccountId: null` for loan-linked transactions.

Cash direction is derived from loan direction and event kind:

| Loan event             | Transaction cash direction |
| ---------------------- | -------------------------- |
| Lending disbursement   | Outflow                    |
| Borrowing disbursement | Inflow                     |
| Lending repayment      | Inflow                     |
| Borrowing repayment    | Outflow                    |

Opening balances, write-offs, and forgiveness are non-cash events and do not
create transactions.

Transaction history shows loan-linked rows with event-specific labels: Lent,
Borrowed, Repayment received, and Repayment paid. Rows open their loan detail
and expose no generic edit or delete action. Add a Loan transaction filter.

`computeBalance` and running-balance logic apply loan inflows/outflows to the
linked account. Income/expense summaries, categories, budgets, savings rate,
and spending analytics explicitly operate on `income | expense`, never on a
catch-all “not transfer” branch.

## Persistence Model

Add three database entities under authenticated per-user ownership.

### `loan_people`

- `id`, `owner_id`, `name`, nullable `note`, timestamps.
- RLS restricts all operations to the owner.
- Deletion is restricted while referenced by any loan.

### `loans`

- `id`, `owner_id`, `person_id`, `direction`, nullable `description`, nullable
  `note`, nullable `due_date`, nullable `original_date`, timestamps.
- Direction is constrained to `lending | borrowing` and is not patchable.
- Status and outstanding balance are derived, not stored mutable fields.

### `loan_events`

- `id`, `owner_id`, `loan_id`, `kind`, positive `amount`, `event_date`,
  timestamps.
- Kinds: `disbursement | opening | repayment | write_off | forgiveness`.
- Exactly one `disbursement` or `opening` origin exists per loan.
- At most one active closing event exists per loan.
- Closing-event amount equals the outstanding balance immediately before
  closure, preserving historical net-worth calculations.
- `event_date` and all other loan dates are date-only local dates. Financial
  event dates cannot be in the future; due date may be.
- Owner IDs must match across Person, Loan, Event, Transaction, and Account
  references.

Add `transactions.cash_flow_direction` and
`transactions.loan_event_id`. `loan_event_id` is a unique nullable FK with
`ON DELETE CASCADE`, so deleting an event deletes its projected transaction.
Database checks enforce that `type = 'loan'` has direction, event link, null
category, and null destination account; non-loan rows have null loan-only
fields.

Use migration-level indexes for owner/person loan listing, owner/loan event
history, due-date filtering, and unique origin/closure constraints.

## Mutation Ownership and Atomicity

Loan events are authoritative for loan state; their transaction rows project
cash effects into the account ledger. Follow ADR 0006:

- Create disbursed loan: insert Loan + origin Event + linked Transaction in one
  database operation.
- Create opening loan: insert Loan + opening Event with no Transaction.
- Add/update/delete repayment: validate outstanding balance and mutate Event +
  Transaction atomically.
- Edit disbursement financial fields: mutate origin Event + Transaction
  atomically.
- Write off/forgive/reopen: mutate the non-cash closing Event atomically.
- Delete loan: cascade through Events to linked Transactions atomically.

Implement these multi-row operations as SQL functions called by the API (the
existing subscription logging RPC is the nearest local precedent). Functions
lock the loan/event rows needed to prevent concurrent repayments from
overpaying and validate authenticated ownership server-side.

Generic transaction create must reject `type: 'loan'`; only loan operations
may create it. Generic transaction patch/delete/bulk-delete must reject any row
with `loanEventId`, including mixed bulk selections, with a domain error that
directs the client to Loans.

## Accounting and Reports

### Core definitions

- Account total = sum of all computed account balances.
- Lending outstanding is a receivable asset.
- Borrowing outstanding is a liability.
- Net worth = account total + lending outstanding − borrowing outstanding.
- Loan principal never contributes to income, expense, budgets, savings rate,
  or spending categories.
- Write-offs and forgiveness are net-worth adjustments, not ordinary expenses
  or income.

### Financial Position report

Add a second Reports type, **Financial Position**, using the existing monthly
report shell and backend `from`/`to` date-range convention. Return and display:

- Opening and closing account total.
- Opening and closing lending outstanding.
- Opening and closing borrowing outstanding.
- Opening and closing net worth.
- Income, expenses, and surplus/deficit for the period.
- Loan cash-flow breakdown:
  - money lent
  - money borrowed
  - lending repayments received
  - borrowing repayments paid
  - net loan cash flow
- Balance adjustments, signed net.
- Lending write-off losses.
- Borrowing forgiveness gains.
- Opening-loan adjustments: lending balances added as assets and borrowing
  balances added as liabilities during the selected period.

The report must prove both reconciliations:

```text
ending account total
  = starting account total
  + surplus/deficit
  + net loan cash flow
  + balance adjustments

ending net worth
  = starting net worth
  + surplus/deficit
  + balance adjustments
  + opening lending balances
  - opening borrowing balances
  - write-offs
  + forgiveness
```

Transfers cancel when totals span all accounts. Opening-loan events enter loan
outstanding and net worth on their balance-as-of date without appearing in
loan cash flow; the explicit opening-loan adjustment lines keep a period that
contains that date reconcilable. Boundary calculations must derive event state
as of `from` exclusive/opening and `to` inclusive/closing rather than using
current loan status.

Keep the existing Income vs Expense report focused on income/expense; change
its filters from `type !== 'transfer'` to explicit `income | expense` handling
so loan rows cannot fall into the expense branch.

### Dashboard

- Preserve Account total as the liquid-money KPI.
- Add Net worth as a distinct KPI with account total, lending receivables, and
  borrowing liabilities available as its breakdown.
- Add a compact Loans summary linking to `/loans`, including owed to user, user
  owes, net position, and overdue count.
- Historical net-worth trend includes loan events as-of each point; account
  balance trend remains a separate liquidity concept where exposed.

## API and Shared Contracts

Add shared Zod models, DTOs, and row mappers for Person, Loan, LoanEvent, list
summaries, detail/history, and Financial Position report responses. Use strict
discriminated schemas for transaction types so invalid loan field combinations
cannot enter TypeScript as broad optional-field objects.

Add a `packages/api/src/features/loans/` slice following the repository's
route/controller/service/repository structure. The HTTP surface should cover:

- List/create/update/delete People.
- List loans with filters and person-level aggregates.
- Get loan detail with event history and derived status/outstanding balance.
- Create a disbursed or opening loan.
- Update loan metadata and origin corrections under the rules above.
- Delete an erroneous loan.
- Add/update/delete a repayment.
- Write off, forgive, and reopen.

Add `GET /api/reports/financial-position?from=YYYY-MM-DD&to=YYYY-MM-DD` under
the existing reports feature. Validate ownership and every response at the
shared-schema boundary.

## Web UI

### Routes and navigation

- Add `/loans` for the dedicated responsive Loans page.
- Add `/loans/$loanId` as a stable deep link for loan detail, including links
  from transaction rows.
- Desktop: add Loans to sidebar and command palette, plus New loan creation
  action.
- Mobile: add Loans to the Other hub; do not crowd the four-item bottom nav and
  center transaction FAB.
- Dashboard loan summary links to `/loans`; overdue items may deep-link to
  detail.

### Loans page

Default to a Person-first view:

- Page KPIs: total owed to user, total user owes, overall net position, and
  overdue count.
- Each Person row/card: both gross amounts, net position, open count, overdue
  count.
- Person detail: separate loans with direction, description, origin amount,
  outstanding balance, due state, and status.
- Filters: lending/borrowing and open/due soon/overdue/repaid/written
  off/forgiven.
- Default ordering: overdue first, then nearest due date, then most recent
  origin date.
- Closed history remains available through filters but does not dominate the
  default open view.

Loan detail shows origin, account movement when present, outstanding balance,
due date, chronological event history, and actions allowed by current state.
Use purpose-built desktop and mobile layouts consistent with existing feature
patterns: drawer/dialog forms on desktop and bottom-sheet forms on mobile.

### Forms and actions

- New loan begins with Lending or Borrowing, then existing/new Person.
- Normal disbursement requires amount, account, and local date; description,
  due date, and note are optional.
- “Track existing loan” switches to opening balance, balance-as-of date,
  optional original date, and no account selector.
- Repayment form requires amount, account, and local date and defaults amount
  to the current outstanding balance while allowing a partial value.
- Write-off/forgiveness, reopen, and delete use explicit confirmation copy that
  distinguishes real closure from correction.
- All amount fields reuse the shared VND amount component and formatting.
- Add Vietnamese and English translations for navigation, forms, direction,
  events, state, validation, empty/error/loading states, report labels, and
  confirmation copy.

## Query and Cache Behavior

- Add the standard web `features/loans/db.ts` and `queries.ts` data layer.
- Query keys include authenticated user ID and relevant filters/detail ID.
- Every loan mutation invalidates loans, People aggregates where relevant,
  transactions, accounts, dashboard, and financial-position reports.
- Pull-to-refresh and global app-data loading include loan summary data without
  blocking unrelated pages on full loan history payloads.
- Transaction rows resolve loan links from lightweight event/loan metadata;
  avoid fetching all histories per row.

## Error, Empty, and Loading States

- Empty Loans page explains Lending, Borrowing, and Track existing loan entry
  points.
- Person with no open loans remains discoverable only when closed-history
  filters apply or through Person management.
- Domain validation errors distinguish overpayment, closed loan, wrong closure
  action, immutable direction, linked-transaction mutation, missing/archived
  account, and ownership/not-found failures.
- Reuse existing mutation error handling, skeletons, responsive overlays, and
  offline banner behavior. There is no offline write queue in this feature.

## Scope of Work

1. **Database migration** — People, Loans, Events, transaction loan fields,
   constraints/indexes/RLS, cascades, and atomic SQL functions.
2. **Shared package** — discriminated transaction contract, loan models/DTOs,
   mappers, event-derived calculations, net-worth/reconciliation DTOs, and
   tests.
3. **API loans slice** — routes/controller/service/repository, ownership and
   lifecycle rules, RPC integration, derived list/detail responses, and tests.
4. **API reports/dashboard** — historical position aggregation, complete
   reconciliation, explicit income/expense filtering, and net-worth summaries.
5. **Web data layer** — loan CRUD/event queries and financial-position report
   query with comprehensive invalidation.
6. **Web Loans UI** — responsive person-first list, detail, forms, filters,
   state/actions, loading/empty/error handling, and i18n.
7. **Web integration** — routes/navigation/palette, transaction read-only rows
   and filter, dashboard account-total/net-worth/loan summaries, Reports type,
   and pull-to-refresh/loading integration.

## Verification

### Shared and accounting

- Every disbursement/repayment direction changes the correct account balance.
- Loan movements never enter income/expense, budgets, savings rate, or category
  analytics.
- Outstanding balance and every derived status cover partial/final repayment,
  overdue, write-off, forgiveness, reopen, and repayment correction.
- Historical loan balances honor event dates and opening balance-as-of dates.
- Both report reconciliation equations balance exactly across mixed income,
  expense, transfer, loan, balance-adjustment, write-off, and forgiveness data.
- A period containing an opening loan balances through the opening-loan
  adjustment without fabricating account cash flow.

### API and database

- Atomic creation/edit/deletion never leaves a Loan Event without its required
  Transaction or a linked Transaction without its Event.
- Concurrent repayments cannot exceed outstanding balance.
- Generic single and bulk transaction mutations reject loan-linked rows.
- Cascading mistaken-loan deletion removes events and linked transactions.
- Person deletion is blocked while any loan history exists.
- Direction immutability, closure direction, future-date, owner isolation, and
  archived-account rules are enforced server-side.
- Every route and report validates its shared response schema.

### Web

- Create lending, borrowing, and opening loans on mobile and desktop.
- Record, edit, and delete partial/final repayments through different accounts.
- Loan-linked transaction rows show the correct label/direction, have no generic
  edit/delete action, and deep-link to loan detail.
- Person-first totals, filters, ordering, due-soon/overdue states, and closed
  history are correct.
- Write-off, forgiveness, reopen, loan deletion, and Person deletion guards
  present the correct confirmation/error behavior.
- Desktop sidebar/palette, mobile Other hub, dashboard, and Reports navigation
  all expose Loans without changing the mobile bottom nav.
- English and Vietnamese copy render for every new surface.

### Agent gate

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Open Items

None. The exclusions above are deliberate v1 boundaries, not unresolved
questions.
