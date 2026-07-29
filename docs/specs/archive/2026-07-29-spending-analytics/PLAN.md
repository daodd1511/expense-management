# Spending Analytics — Plan

Produced via `/grill-with-docs`. All product decisions below were explicitly confirmed.

## Goal

Answer: **Where is the User's money going, and how has that Spending changed versus the previous comparable period?**

## Domain Boundary

Spending follows `CONTEXT.md`: expense Transactions only, excluding Transfers, loan-linked Transactions, and Unexplained adjustments. Transfer-fee expense Transactions remain Spending.

## Current State

- Reports already provides `Income vs Expense` and `Financial position` types.
- Report APIs accept `from` and `to`, but the Reports shell exposes only a month selector.
- Income/expense reporting already groups Transactions by Category and supports Transaction drill-down.
- Categories are at most two levels deep.

## Decisions

- **Third Report type**: add `Spending analysis`; do not replace either existing Report.
- **Comparable ranges**: show current and immediately preceding equal-length periods.
- **Range choices**: This month, Previous month, last 3/6/12 complete months, and Custom.
- **This-month comparison**: compare elapsed days with the same number of days from the previous month, capped at that month's last day.
- **Custom comparison**: use the immediately preceding equal number of inclusive calendar days.
- **Adaptive trend**: daily through 31 days, Monday–Sunday weekly for 32–180 days, and monthly beyond 180 days.
- **Parent-first Categories**: roll child Spending into its parent by default, then expand to children and underlying Transactions; root custom Categories stand alone.
- **Uncategorized is explicit**: expense Transactions without a Category form an `Uncategorized` bucket.
- **No merchant analytics**: current merchant text is not normalized and may be synthetic.
- **No Budget variance**: descriptive Spending and planned Budget performance remain separate concerns.

## Report Range Model

1. Replace the month-only Reports-shell state with a reusable URL-backed range model containing preset/from/to.
2. Preserve month URLs by normalizing an existing `month=YYYY-MM` search into the equivalent range.
3. Keep the selected range when switching Report types so later CSV export can use the same range.
4. Pass the resolved `from`/`to` range to all Report queries; existing backend contracts already accept it.

## Shared Contract and API

1. Add a shared Spending-analysis DTO containing:
   - selected and comparison ranges;
   - current/previous Spending totals, absolute change, and nullable percentage change;
   - aligned current/comparison trend buckets;
   - parent Category aggregates, child aggregates, shares, changes, counts, and drill-down Transactions.
2. Represent change from a zero baseline explicitly: percentage is `null`; current positive Spending is labelled `New`, while two zero values are unchanged.
3. Add an authenticated `GET /reports/spending-analysis?from=YYYY-MM-DD&to=YYYY-MM-DD` route.
4. Reuse Report Transaction/Category repository reads, applying User ownership filters and the Spending exclusions above.
5. Build both ranges server-side so comparison rules are consistent across clients.

## Web Changes

1. Add the range selector to the Reports shell for desktop and mobile, including custom local-date inputs.
2. Register `Spending analysis` in the existing Report type registry and data-query layer.
3. Show headline Spending, absolute/percentage change, and the adaptive current-versus-previous trend.
4. Show parent Category share/change, expandable children, and Transaction drill-down through the existing Transaction overlay.
5. Keep all visible Category names localized through the existing Category cache.

## Verification

- Range presets and custom ranges resolve to the specified comparison periods at month-length, leap-year, and year boundaries.
- Daily, weekly, and monthly buckets reconcile to total Spending for both periods.
- Transfers, loan-linked Transactions, and Unexplained adjustments never enter Spending; transfer fees do.
- Parent totals equal their children plus direct parent Transactions.
- Uncategorized Transactions remain visible and drillable.
- Another User's Transactions and custom Categories never affect results.
- Switching Report types preserves the selected range and legacy month URLs still resolve correctly.

## Explicitly Out of Scope

- Merchant/payee identity or merchant analytics.
- Budget variance, forecasts, recommendations, alerts, or anomaly detection.
- Income analytics beyond the existing Income vs Expense Report.
- Download/export behavior; Data Portability consumes the shared range later.

## Open Items

None.
