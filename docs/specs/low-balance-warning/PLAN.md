# Low Balance Warning — Plan

Produced via `/grill-me`. All product decisions below were explicitly confirmed.

Motivated by a prepaid cellular Subscription: the plan costs a fixed 79.000 ₫ per month,
but cash leaves the bank in irregular top-ups (100.000 ₫, then 30.000 ₫ once a surplus
accumulates). Modelling the carrier as an e-wallet Account resolves the tracking problem
with no code. The one gap that model leaves — nothing warns when an Account cannot fund
its upcoming Subscription charges — is what this spec builds.

## Goal

Warn the user, before a charge lands, when an Account's Computed balance will not cover the
Subscription charges due against it inside the funding horizon.

## Domain and Architecture Decisions

- **Consumption is the expense, not cash-out.** A stored-value provider is an Account of
  kind `ewallet`. Topping it up is a Transfer, excluded from spending totals. The
  Subscription charges that Account on its own Cadence. The surplus is the Account's
  Computed balance, requiring no separate concept.
- **No new persistence.** `log_subscription` already charges the Subscription's own
  `accountId` (`packages/api/src/features/subscriptions/repository.ts:96`), so the prepaid
  model works against today's schema. This spec adds no column, migration, or API route.
- **Client-side derivation.** Accounts carry a server-computed `balance` and both Accounts
  and Subscriptions already sit in the TanStack Query cache. The rule is a pure function
  over those two lists.
- **Funding horizon is distinct from Due soon.** `CONTEXT.md` fixes _Due soon_ at seven
  days. This rule uses thirty. The two windows serve different questions and must not share
  a name.
- **The ledger records what happened.** A short balance never blocks, gates, or warns
  against logging a Subscription. A charge may occur despite insufficient recorded funds —
  a top-up made outside the app, or a provider extending credit.
- **`ewallet` stays a label.** The rule keys off "has an active Subscription charged to it",
  not off Account kind. Giving `ewallet` rule-bearing behaviour would make Account kind a
  semantic type, a larger commitment than this feature warrants.

## The Rule

An Account is **underfunded** when all of the following hold:

1. Its kind is not `card`. A card Account's balance represents debt, not available funds,
   so the comparison carries no meaning there.
2. At least one active Subscription charges it.
3. Its Computed balance is less than the sum of `amount` across every active Subscription
   charging it whose `nextDueDate` falls within thirty days — including dates already
   passed, since an unlogged Subscription's `nextDueDate` does not advance.

Inactive Subscriptions never contribute. Yearly Subscriptions contribute only once their
`nextDueDate` enters the horizon, so an annual charge cannot hold a warning open all year.

## Web

1. Add a pure predicate beside `isDue` / `isDueSoon` in
   `packages/web/src/features/subscriptions/helpers.ts`, returning the underfunded Accounts
   with each one's shortfall.
2. Add a banner component reading `useAccounts` and `useSubscriptions`. It names each
   underfunded Account and its shortfall in Đồng.
3. Mount it wherever `SubscriptionDueBanner` mounts — `routing/app-pages.tsx` and
   `features/subscriptions/components/DesktopSubscriptions.tsx` — rendered **above** it when
   both appear. The two components stay independent, sharing no state.
4. Hand-roll the banner markup against `SubscriptionDueBanner`'s existing classes. Do not
   extract a shared primitive from a single example.
5. Render no dismiss control. The warning clears when the condition clears.
6. Add every string to both `VI` and `EN` in `core/i18n.tsx`.

## Setup (data entry, not build)

Performed by the user against live data; no migration ships.

1. Create an Account named Itel, kind `ewallet`, Opening balance `14102`.
2. Repoint the existing cellular Subscription's `accountId` at it, with `nextDueDate` on the
   next cycle — the current cycle is already paid.
3. Record no historical Itel Transactions. The single prior month keeps its original
   treatment.
4. Record future top-ups as Transfers from the funding bank Account to Itel.

## Verification

- An Account below the horizon sum reports as underfunded with the exact shortfall; one at
  or above it does not.
- A `card` Account never reports as underfunded, whatever its balance.
- An Account with no active Subscription never reports as underfunded.
- An inactive Subscription contributes nothing to the horizon sum.
- A yearly Subscription contributes only inside the horizon, not outside it.
- An overdue, unlogged Subscription contributes to the horizon sum.
- Two Subscriptions charging one Account sum, rather than compare individually.
- When both banners qualify, the low-balance banner renders above the due banner.
- Logging a Subscription succeeds while its Account is underfunded.
- Both languages render every string with no missing key.

## Accepted Consequences

- The warning fires on first deploy: 14.102 ₫ against 79.000 ₫ due next month. Correct — a
  top-up is genuinely required.
- Logging a monthly Subscription sets `nextDueDate` thirty-one days out, leaving a one-day
  quiet gap before the next horizon opens.
- Telecom Category totals show irregular top-ups before the cutover and a flat 79.000 ₫
  after. A one-time seam, accepted over restating history.

## Explicitly Out of Scope

- Any API route, database column, or migration.
- A top-up action on the banner. Prefilling a new Transaction requires splitting
  `TransactionForm`'s `initial` prop into edit-versus-seed concepts; that refactor stands on
  its own merits and belongs in its own spec.
- A shared banner primitive in `shared/components/ui/`.
- A configurable horizon, a buffer multiplier, or per-Account thresholds.
- Persisted dismissal.
- Restating the prior month's Transactions.
- Multi-currency, and the foreign-currency Subscription problem generally — a separate,
  unrelated model change to be grilled on its own.

## Open Items

- `CONTEXT.md` has no term for a stored-value Account's held float, nor for _underfunded_ or
  _funding horizon_. Route through `docs/DOMAIN-RULEBOOK.md` before or alongside execution.

## Spec Delta

Capability: `subscriptions`

### ADDED Requirement: Underfunded Account warning

#### Scenario: Account cannot cover charges inside the funding horizon

**WHEN** an Account that is not of kind `card` has at least one active Subscription charging
it, and its Computed balance is less than the sum of those Subscriptions' amounts whose
`nextDueDate` falls on or before thirty days from today
**THEN** a banner on the dashboard names that Account and the shortfall amount

#### Scenario: Account covers its upcoming charges

**WHEN** an Account's Computed balance is at least the sum of its Subscription charges
inside the funding horizon
**THEN** no banner appears for that Account

#### Scenario: Charge falls outside the funding horizon

**WHEN** a Subscription charging an Account has a `nextDueDate` more than thirty days away
**THEN** its amount is excluded from that Account's horizon sum

#### Scenario: Charge is overdue and unlogged

**WHEN** a Subscription charging an Account has a `nextDueDate` in the past and no
Transaction logged for that cycle
**THEN** its amount is included in that Account's horizon sum

#### Scenario: Card Account is excluded

**WHEN** an Account of kind `card` has Subscriptions charging it and a balance below their
horizon sum
**THEN** no banner appears for that Account

#### Scenario: Inactive Subscription is excluded

**WHEN** a Subscription charging an Account is inactive
**THEN** its amount is excluded from that Account's horizon sum

#### Scenario: Both warnings qualify at once

**WHEN** an Account is underfunded and one of its Subscriptions is also due
**THEN** both banners render, with the underfunded warning above the due banner

#### Scenario: Warning cannot be dismissed

**WHEN** the underfunded banner is shown
**THEN** it offers no dismiss control and remains until the Account's balance covers the
horizon sum

#### Scenario: Logging is never gated on funding

**WHEN** the user logs a Subscription charged to an underfunded Account
**THEN** the Transaction records normally and the Account's balance may go negative
