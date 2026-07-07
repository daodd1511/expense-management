# Wallet — Domain Language

The ubiquitous language for this personal expense manager. Glossary only — no
implementation details, no schema, no file references. Define what a term IS,
not how it is built. Prefer the canonical term; the `_Avoid_` list names the
synonyms not to use.

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
plus every income, minus every expense, adjusted for transfers. Derived on
demand, never stored.
_Avoid_: current balance, running balance

**Post-transaction balance**:
An account's computed balance immediately after a particular transaction is
applied.
_Avoid_: remaining balance, balance after

**Transaction**:
A single movement of money: an income, an expense, or a transfer.
_Avoid_: entry, record, payment

**Ledger order**:
The chronological order in which transactions are applied to derive balances.
_Avoid_: display order, row order, sort order

**Transfer**:
A transaction that moves money between two of the user's own accounts. It is
neither income nor expense and is left out of spending and income totals.
_Avoid_: internal payment, move

## Categorization

**Category**:
A label that classifies a transaction, nested at most two levels deep. A child
category always shares its parent's type (income or expense).
_Avoid_: tag, group

**System category**:
A category owned by no user and shared by everyone; users cannot delete it.
_Avoid_: default category, global category, preset

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
A subscription is _due_ when its next occurrence date has arrived or passed, and
_due soon_ when that date falls inside the near-term warning window.
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
