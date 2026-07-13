# Wallet — Domain Language

The ubiquitous language for this personal expense manager. Glossary only — no
implementation details, no schema, no file references. Define what a term IS,
not how it is built. Prefer the canonical term; the `_Avoid_` list names the
synonyms not to use.

## Users & Ownership

**User**:
A person who signs up for the app and has their own private financial data.
_Avoid_: app account, login account, profile

## Money & Accounts

**Account**:
A place the user's money lives — cash, bank, card, or e-wallet.
_Avoid_: wallet (the app is the wallet; accounts sit inside it)

**Opening balance**:
The fixed amount an account started with. It does not change as transactions
are added.
_Avoid_: initial balance, starting balance

**Computed balance**:
An account's balance at a point in the ledger, derived from its opening balance
and every transaction applied in ledger order. Derived on demand, never stored.
_Avoid_: current balance, running balance

**Post-transaction balance**:
An account's computed balance immediately after a particular transaction is
applied.
_Avoid_: remaining balance, balance after

**Transaction**:
A single movement of money: an income, an expense, a transfer, or a
loan-linked transaction.
_Avoid_: entry, record, payment

**Ledger order**:
The chronological order in which transactions are applied to derive balances.
_Avoid_: display order, row order, sort order

**Transfer**:
A transaction that moves money between two of the user's own accounts. It is
neither income nor expense and is left out of spending and income totals.
_Avoid_: internal payment, move

**Personal loan**:
Money transferred directly between the user and another person with an
expectation of repayment, regardless of which account supplies or receives it.
It excludes paid-on-behalf IOUs and loans from formal lenders.
_Avoid_: cash loan, debt, IOU

**Person**:
An individual with whom the user has one or more personal loans.
_Avoid_: contact, counterparty

**Loan direction**:
Whether a personal loan is lending (the person owes the user) or borrowing (the
user owes the person). A loan keeps one direction for its lifetime; opposite
directions are separate loans.
_Avoid_: transaction direction, net direction

**Net position**:
The difference between what one person owes the user and what the user owes
that person, shown as a summary without combining the underlying loans.
_Avoid_: net loan, consolidated loan

**Disbursement**:
The single initial transfer of money that creates a personal loan. Transferring
more money later creates another loan rather than enlarging the first.
_Avoid_: top-up, advance

**Principal**:
The original Đồng amount of a personal loan established by its disbursement.
It does not change as repayments are recorded.
_Avoid_: loan balance, original balance

**Opening loan balance**:
The outstanding amount of an existing personal loan when the user begins
tracking it. It establishes the loan without creating a historical account
transaction.
_Avoid_: principal, disbursement, repayment

**Repayment**:
A transfer of money that reduces one personal loan. A loan may have multiple
partial repayments, each through any account.
_Avoid_: instalment, settlement

**Loan-linked transaction**:
An account transaction created by a personal-loan disbursement or repayment.
It appears in transaction history but is managed through its loan.
_Avoid_: duplicate transaction, manual transaction

**Outstanding balance**:
The unpaid portion of one personal loan, derived from its disbursement or
opening loan balance, repayments, and any closing event.
_Avoid_: principal, account balance, remaining principal

**Loan due date**:
The optional local date by which a personal loan is expected to be fully
repaid.
_Avoid_: repayment schedule, reminder date

**Overdue loan**:
A personal loan whose due date has passed while it still has an outstanding
balance.
_Avoid_: late payment, expired loan

**Open loan**:
A personal loan that still has an outstanding balance and has not been written
off or forgiven.
_Avoid_: active loan, pending loan

**Repaid loan**:
A personal loan whose outstanding balance reached zero through repayments.
_Avoid_: settled loan, completed loan

**Net worth**:
The user's total account balances plus outstanding personal lending, minus
outstanding personal borrowing.
_Avoid_: cash balance, account total, liquidity

**Account total**:
The sum of all computed account balances. It measures money held in accounts
and excludes personal-loan receivables and liabilities.
_Avoid_: net worth, wealth

**Balance checkpoint**:
An observed balance for one account at an exact local date and time. It is an
authoritative historical fact that remains even when no correction is needed.
_Avoid_: balance adjustment, reconciliation transaction, snapshot transaction

**Unexplained adjustment**:
The signed difference between a balance checkpoint and the account's computed
balance immediately before it. It is derived from ledger history and is neither
income nor spending.
_Avoid_: fixed correction, adjustment transaction, miscellaneous income, miscellaneous expense

**Surplus / deficit**:
The difference between income and expenses over a period. A positive difference
is a surplus; a negative difference is a deficit.
_Avoid_: cash flow, net worth change

**Loan cash flow**:
Money entering or leaving accounts through personal-loan disbursements and
repayments. It is reported separately from income and expenses.
_Avoid_: loan income, loan expense

**Write-off**:
Closing outstanding personal lending as uncollectible without receiving money.
It is a non-cash loss that reduces net worth.
_Avoid_: delete loan, repayment

**Forgiveness**:
Closing outstanding personal borrowing because the lender no longer requires
repayment. It is a non-cash gain that increases net worth.
_Avoid_: delete loan, repayment

## Categorization

**Category**:
A label that classifies a transaction, nested at most two levels deep. A child
category always shares its parent's type (income or expense).
_Avoid_: tag, group

**System category**:
A category owned by no user and shared by everyone; users cannot delete it.
_Avoid_: default category, global category, preset

**Category display name**:
The category label shown to the user in the current app language; for a custom
category, it is the user's own name.
_Avoid_: canonical category name, translated name

**Favorite**:
A category the user has pinned for quick access. A favorite is a separate pin,
not a property of the category itself.
_Avoid_: pinned category, starred

## Planning

**Budget**:
A spending limit set on a category.
_Avoid_: cap, allowance

**Subscription**:
A recurring, scheduled payment or income the user plans for — distinct from the
actual transaction that records each occurrence.
_Avoid_: recurring transaction, bill, plan

**Cadence**:
How often a subscription recurs (e.g. monthly, yearly).
_Avoid_: frequency, interval, period

**Due / Due soon**:
A scheduled obligation is _due_ when its expected date has arrived or passed,
and _due soon_ when that date falls inside the seven-day warning window.
_Avoid_: upcoming, pending

**Double-log**:
Recording the same subscription occurrence as a transaction more than once in a
single cycle. The app detects and warns against it.
_Avoid_: duplicate payment

## Surfaces

**Transaction overlay**:
The add/edit transaction form, opened on top of whatever page the user is on
without navigating away, so their place is preserved.
_Avoid_: transaction modal, transaction route, add screen

## Conventions

**Đồng amount**:
Every money value is a whole number of Vietnamese đồng — no decimal places and
no other currency.
_Avoid_: cents, minor units, decimal amount

**Local date**:
A calendar date with no time and no timezone (a plain year-month-day), not an
instant.
_Avoid_: timestamp, datetime

**Local time**:
A wall-clock hour and minute with no date and no timezone.
_Avoid_: timestamp, datetime
