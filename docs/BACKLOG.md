# Backlog

Inbox for fixes, features, and ideas — one line per item, newest last in each section.
Capture via `/capture` or by editing directly; agents may append proactively (reported in
their session summary). Delete a line when the item ships or graduates into a
`specs/<feature>/` plan — git history is the archive. No done-lists, no status ceremony.

## Fixes

- [ ] Bulk delete fires N per-id requests; bulk `DELETE /api/transactions` + `useDeleteTransactions` hook sit unused (2026-07-04)
- [ ] Subscription `/log` endpoint non-atomic: inserts transaction then updates `next_due_date` in two calls — move to a Postgres RPC (2026-07-04)
- [ ] Timezone policy split: API month bounds use UTC, FE `inCurrentMonth`/`daysUntilDue` use local — centralize on user-local (2026-07-04)
- [ ] FE fetches all transactions ever despite API `?month=` support — scope queries by month (2026-07-04)
- [ ] `store.tsx` god-context wraps ~20 query hooks; migrate consumers to feature queries, keep only pure selectors (2026-07-04)
- [ ] Money math untested: `computeBalance`, `monthSummary`, subscription due-window have zero unit tests (2026-07-04)
- [ ] `packages/api` dev script builds once and runs `dist/` — no watch on source (2026-07-04)
- [ ] CLAUDE.md architecture/commands sections describe the pre-monorepo app — re-baseline (2026-07-04)
- [ ] Fix UI selected category with favorites (2026-07-05)
- [ ] Dashboard trend chart fed by static `monthlyTrend` seed in `core/data`, not real transactions — wire to live data (fold into Feat7 analytics) (2026-07-05)

## Features

- [ ] Reports: monthly report, category drill-down (tap chart segment / budget bar → transactions), year-over-year (2026-07-04)
- [ ] Export & backup: CSV export, JSON backup/restore (2026-07-04)
- [ ] Budget rollover + near-limit alerts (2026-07-04)
- [ ] Household sharing — deferred until all core functions are present; household/membership schema first, UI later (2026-07-04)
- [ ] Desktop keyboard shortcuts (N = new transaction, / = search) + command palette (2026-07-04)
- [ ] Offline write queue for the PWA (2026-07-04)
- [ ] Small UX batch: account reorder, currency format preference, PIN/biometric lock, per-locale number format (2026-07-04)
- [ ] Loading states for non-form actions: subscription one-tap log, delete confirms (incl. CategoryForm delete), and list/query-level skeletons (forms already covered via useFormSubmit) (2026-07-05)
- [ ] Category icons don't match their names — audit and correct icon-to-name mapping (2026-07-05)
- [ ] Update category select UI in transaction form to match the picker style used in Settings (2026-07-05)
- [ ] Better filter for transaction table (2026-07-05)
- [ ] Better analytics on spendings (2026-07-05)
- [ ] Add adjustment account feature (2026-07-05)
- [ ] Add fee feature (2026-07-05)
- [ ] Better credit card information: view balance, due date, payment status (2026-07-05)
- [ ] Subscription: add confirm payment button that automatically creates a transaction (2026-07-05)
