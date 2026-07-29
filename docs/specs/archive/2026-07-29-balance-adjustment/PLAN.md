# Balance Checkpoint — Plan

Produced via `/grill-with-docs`. This plan supersedes the original fixed
income/expense transaction representation for balance adjustment.

## Problem

An account's computed balance can drift from the balance the user observes in
cash, a bank app, or a statement because transactions were forgotten or entered
late. The current adjustment flow posts a fixed income or expense transaction.
That makes the balance correct only until an earlier transaction is added,
edited, or deleted; the fixed correction then double-counts or undercounts the
historical movement.

The durable fact is not the correction amount. It is the user's observation:
"this account had this balance at this local date and time."

## Goals

- Record an observed account balance as a historical **balance checkpoint**.
- Derive the checkpoint's **unexplained adjustment** from the ledger events
  immediately before it instead of storing a fixed correction.
- Keep every checkpoint authoritative when earlier ledger history changes.
- Make recalculation automatic, deterministic, and server-authoritative.
- Show unexplained movements in Reports without classifying them as verified
  income or spending.
- Preserve the original discrepancy so the user can compare it with the current
  unexplained residual after forgotten transactions are entered.
- Migrate existing hidden-category adjustment transactions without losing their
  historical balance effect.

## Non-Goals

- No bank synchronization or automatic checkpoint creation.
- No automatic inference of missing transaction details or categories.
- No attachment or statement-upload support in this iteration.
- No offline checkpoint writes or conflict-resolution workflow.
- No full revision history for checkpoint edits beyond ordinary creation and
  update metadata.
- No opening-balance editing after account creation.

## Domain Model

### Balance checkpoint

A balance checkpoint is an observed balance for one account at an exact,
timezone-free local date and minute. It is a ledger fact, not a movement of
money and not an income, expense, transfer, or category-bearing transaction.

A checkpoint stores:

- account id;
- observed balance;
- effective local date;
- effective local time (`HH:mm`);
- optional note;
- original discrepancy captured when the checkpoint is created or materially
  edited;
- whether a migrated checkpoint's time was inferred;
- ordinary creation/update audit metadata.

The account is immutable after checkpoint creation. Editing the observed
balance, effective date, or effective time resets the original-discrepancy
baseline. Editing only the note does not.

### Unexplained adjustment

For checkpoint `C`:

```text
unexplainedAdjustment(C)
  = observedBalance(C) - computedBalanceImmediatelyBefore(C)
```

The unexplained adjustment is derived, never authoritative stored balance
movement. Applying a checkpoint sets that account's post-event computed balance
to its observed balance regardless of the current residual:

```text
computedBalanceImmediatelyAfter(C) = observedBalance(C)
```

The original discrepancy is the unexplained adjustment calculated when the
checkpoint is first created, or when its observed balance/effective timestamp is
edited. The current residual is recalculated from current ledger history.
Comparisons show whether the unexplained amount shrank, grew, or changed
direction; the UI must not label every change as "explained" when the residual
instead worsened or crossed zero.

### Zero-residual checkpoint

A checkpoint remains valid when its current residual is zero. It records that
the account was verified at that point and is retained as historical evidence.
Creating a checkpoint whose observed and computed balances already match still
persists the checkpoint.

## Ledger Ordering

- Ledger events use effective local date and local minute; timezone changes do
  not shift historical ordering.
- A transaction with no time sorts at `00:00` while remaining visibly marked as
  time-unspecified.
- At an identical effective date/time, ordinary transactions are applied before
  a balance checkpoint.
- At most one checkpoint may exist for one account at one effective minute.
- Future-dated checkpoints are rejected.
- Multiple checkpoints on one account form a chronological chain. Each
  checkpoint anchors the balance to its observation; only ledger changes since
  the preceding checkpoint affect its current residual.
- Inserting, editing, deleting, or moving a transaction across a checkpoint
  boundary automatically recalculates every affected checkpoint and subsequent
  running balance.
- Editing or deleting a checkpoint automatically recalculates later checkpoints
  on the same account. Later observed balances remain authoritative.

## Persistence and Read Model

Introduce a first-class checkpoint persistence model rather than extending the
hidden-category convention. A dedicated `balance_checkpoints` table keeps
checkpoint facts separate from transactions while allowing the backend to merge
both sources into one ordered ledger projection.

The transaction-list read model becomes a discriminated ledger-event union:

```text
transaction | balance-checkpoint
```

A checkpoint ledger event exposes:

- observed balance;
- original discrepancy;
- current unexplained residual;
- effective local date/time;
- optional note;
- inferred-time review state;
- post-event computed balance.

Derived residuals and post-event balances are computed by the backend in ledger
order. Clients do not replay checkpoint semantics independently.

## API

Use dedicated authenticated operations for checkpoints:

- preview a checkpoint for account, observed balance, date, and time;
- create a checkpoint;
- update its observed balance, date, time, or note;
- delete a checkpoint;
- list affected checkpoints for review after recalculation.

The preview returns the ledger balance immediately before the proposed
checkpoint and its estimated unexplained adjustment. Create/update recalculates
inside the authoritative server operation and never trusts the preview result.

Ordinary transaction endpoints reject checkpoint payloads. Checkpoint endpoints
reject transaction-only fields such as category, destination account, fee, or
subscription linkage.

Opening balance is immutable in the account patch schema and API after account
creation, matching the existing UI invariant.

## Recalculation Feedback

When a transaction or checkpoint mutation changes one or more current residuals:

- save the mutation without a blocking confirmation;
- return or expose the affected checkpoint before/after residuals;
- show one non-blocking notice only when at least one residual actually changed;
- summarize multiple changes (for example, "3 balance checkpoints
  recalculated");
- provide a Review action that opens the affected checkpoint details.

Mutations that leave every residual unchanged produce no notice.

## Adjustment Form

Reuse `ReconcileBalanceForm` as the dedicated balance-checkpoint form.

### Create mode

- Account is fixed by the account-level entry point.
- Effective date/time defaults to the current local minute and may be backdated.
- Observed balance defaults to the account's current computed balance.
- Optional note is available.
- A server-backed preview shows:
  - ledger balance immediately before the proposed checkpoint;
  - observed balance;
  - derived unexplained adjustment.
- Matching balances create a zero-residual checkpoint rather than closing
  without persistence.

### Edit mode

- Uses the same form and loads the stored observation, effective date/time, and
  note.
- Account cannot change.
- Users edit checkpoint facts, never residual type or amount.
- Changing observation/date/time resets the original-discrepancy baseline.
- Note-only edits retain the baseline.

The entry point remains account-only on mobile and desktop. Checkpoints are not
added to the ordinary Add Transaction type tabs.

## Ledger UI

- Checkpoints appear chronologically as distinct neutral "Balance checkpoint"
  rows.
- A row shows observed balance, current signed unexplained adjustment, effective
  date/time, and note when present.
- Checkpoints do not use income green, expense red, or a category treatment.
- Opening a row uses the dedicated checkpoint form.
- Deletion uses checkpoint-specific confirmation explaining that later ledger
  balances/checkpoints will be recalculated.
- The Transactions page adds an Adjustment filter. All includes transactions
  and checkpoints; other type filters include only their transaction type.
- The page title remains "Transactions," but mixed-result counts and empty states
  use "ledger entries."
- Checkpoints are searchable by account name and note.

## Reporting

Checkpoints represent unexplained account movement and must be visible without
being misclassified.

Reports show a separate adjustment section with:

- unexplained increases;
- unexplained decreases;
- net unexplained adjustment;
- per-account totals;
- expandable checkpoint details containing observed balance, original
  discrepancy, current residual, baseline comparison, effective date/time, and
  note.

Zero-residual checkpoints remain visible as "Fully explained" balance
verifications but do not contribute to increase/decrease/net adjustment totals.

The current residual belongs to the checkpoint's effective reporting period.
Adding historical transactions later updates that historical period
retroactively.

Unexplained adjustments are excluded from:

- recorded income and expense totals;
- category aggregates and spending donuts;
- budgets;
- savings rate;
- surplus/deficit;
- ordinary transaction counts.

Their balance effect is included in:

- account computed balances and post-event running balances;
- account total;
- net worth;
- balance trends;
- ledger reconciliation of opening balance to closing balance.

Archived accounts retain their checkpoint and ledger history for historical
reporting, while remaining absent from active-account adjustment actions and
current active-account totals.

## Migration

Migrate legacy transactions linked to the two hidden `Balance Adjustment`
system categories before removing the categories.

For each legacy adjustment in its original ledger position:

```text
observedBalance
  = computedBalanceImmediatelyBeforeLegacyAdjustment
    + signedLegacyAdjustmentAmount
```

- Preserve account, date, note, and audit metadata where possible.
- Use the transaction's explicit time when present; otherwise infer a local
  minute from available creation metadata and mark the checkpoint `time
  inferred`.
- Set the migrated checkpoint's original discrepancy from the signed legacy
  adjustment effect.
- Migrated checkpoints are active immediately.
- Inferred-time checkpoints receive a non-blocking "Review time" badge and a
  one-time review list.
- The migration must be deterministic when several legacy events share a date.
- After verifying that no transactions reference the legacy adjustment category
  ids, remove the two system categories and their translations.
- Retain the generic hidden-category capability because other system behavior,
  including Transfer Fee, still uses it.

Migration logic must identify the canonical category ids from database data,
not localized API display names.

## Domain and Documentation Changes

- `CONTEXT.md` uses **Balance checkpoint** for the observed fact and
  **Unexplained adjustment** for its derived residual.
- The old **Balance adjustment** term is retired because it conflates the fact
  with the correction.
- Feature-scoped ordering, UI, API, reporting, and migration decisions remain in
  this plan.
- An ADR for authoritative ledger checkpoints has been offered but is not part
  of this plan unless separately accepted.

## Verification

### Core calculation

- A checkpoint stores observed balance `40` when pre-checkpoint balance is `50`;
  current residual is `-10`, post-event balance is `40`.
- Adding an earlier expense of `20` changes that residual to `+10` while the
  post-checkpoint balance remains `40`.
- Adding an earlier expense of `5` changes the residual to `-5` while the
  post-checkpoint balance remains `40`.
- Transactions after the checkpoint do not change its residual.
- A transaction moved across the checkpoint boundary recalculates the correct
  side of the chain.
- Same-minute ordinary transactions apply before the checkpoint.
- Multiple checkpoints anchor their own observed balances independently.

### Checkpoint lifecycle

- Create positive-, negative-, and zero-residual checkpoints.
- Reject future and duplicate account/minute checkpoints.
- Edit observation/date/time and verify baseline reset plus downstream
  recalculation.
- Edit note only and verify the baseline remains unchanged.
- Delete a checkpoint and verify later checkpoints/running balances recalculate.
- Archive an account and verify checkpoint history remains available.

### API and concurrency

- Preview is server-calculated but submission recalculates authoritatively.
- A concurrent transaction inserted between preview and submit cannot produce a
  stale post-checkpoint balance.
- Ordinary transaction APIs reject checkpoint mutations and vice versa.
- Opening balance patch attempts are rejected.

### UI and notification

- Create/edit reuse the adjustment form with editable local date/time and note.
- Ledger row is neutral, distinct, searchable, and filterable as Adjustment.
- A changed residual produces one notice with before/after review data.
- Multiple affected checkpoints produce one summarized notice.
- No residual change produces no notice.

### Reporting

- Adjustment increases, decreases, and net are reported separately from
  income/expense.
- Per-account and checkpoint details reconcile to summary totals.
- Zero-residual checkpoints appear as verified and do not affect totals.
- Historical transaction changes update the checkpoint's effective report
  period.
- Category, budget, savings-rate, and surplus/deficit outputs remain unaffected
  by checkpoint residuals.
- Account balances, account total, net worth, and balance trends include the
  checkpoint effect.

### Migration

- Every legacy adjustment becomes one checkpoint with the same historical
  post-event balance.
- Missing times are inferred deterministically and flagged for review.
- Legacy adjustment categories are removed only after all references are gone.
