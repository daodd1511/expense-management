# Release v1.0

A private household expense ledger: track transactions, accounts, budgets, and
recurring subscriptions, with reporting — Vietnamese-first (VI/EN), installable
as a PWA on mobile and desktop.

Not a formal spec (no `PLAN.md`/`EXECUTION.md`) — this is a scope inventory to
align on before a v1.0 cut. Full rationale for any item belongs in
`docs/BACKLOG.md` or a dedicated `docs/specs/<feature>/PLAN.md`, not here.

## Shipped

**Transactions** — expense/income/transfer CRUD; category, account, date,
optional time, note; search/filter by type/category/account/month; desktop
sortable table with bulk delete, mobile day-grouped list with swipe actions
and pull-to-refresh; optimistic updates.

**Accounts** — cash/bank/card/e-wallet, signed opening balance, computed
running balance; reconcile against a real-world balance (posts a signed
adjustment transaction).

**Categories** — two-level (parent/child) tree, expense/income typed, icon +
color; protected system categories; favorites with a "show all" fallback used
across every category picker in the app.

**Budgets** — per-category monthly limits with spent/limit progress and
over/near/on-track states; a category can be budgeted at leaf or parent level,
never both in the same branch.

**Subscriptions** — recurring expense/income entries (monthly/yearly cadence),
due/due-soon tracking, one-tap "log now" that posts a real transaction and
advances the next due date, active/paused toggle.

**Reports** — month-scoped income/expense/net totals, category breakdown with
drill-through to the underlying transactions.

**Dashboard** — month summary, expense-by-category chart, subscriptions and
balance-trend widgets, recent transactions, account list.

**Auth** — Supabase email/password and Google sign-in; sign-up, forgot/reset
password.

**Settings** — light/dark theme, VI/EN language, sign-out, app version with
PWA update prompt; category management.

**Platform** — installable PWA (manifest, update-available prompt); mobile
bottom-nav + bottom sheets, desktop sidebar + drawers with a command palette
and keyboard shortcuts.

## Shipped with known limitations

- **No offline writes** — the PWA installs and launches offline, but reads
  and writes still hit the network and fail normally without connectivity;
  there's no write queue.
- **No receipt upload** — the field exists end-to-end in the schema/model,
  but there is no UI to attach one; always submitted as `null`.
- **One report type** — the report-type selector UI exists for future
  types, but only Income vs Expense is implemented today.

## Blocking v1.0

Per `docs/BACKLOG.md` (source of truth — check there for the current list):
- **Fee feature** (priority: high)

## Explicitly out of scope for v1.0

- Data export/backup (CSV/JSON)
- Offline write queue
- Lend & borrow tracking
- Non-Google OAuth providers
