# Features

Track planned, in-progress, and shipped features.

**Status legend:** `[ ]` planned · `[~]` in progress · `[x]` done

---

## Core

- [x] Transaction add / edit / delete
- [x] Transaction list with filter (all / income / expense / transfer) and search
- [x] Transaction swipe-to-edit / delete (mobile)
- [x] Transaction table with pagination and bulk delete (desktop)
- [x] Transfer between accounts
- [x] Receipt image attachment
- [x] Date picker (calendar popover)

## Accounts

- [x] Account list (cash, bank, card, e-wallet)
- [x] Account add / edit
- [x] Account delete
- [x] Account swipe-to-edit / delete (mobile)
- [x] Net worth summary card
- [ ] Account reorder / sort

## Budgets

- [x] Budget list with progress bars per category
- [x] Budget state colors (on track / near limit / exceeded)
- [x] Monthly budget summary
- [ ] Budget add / edit / delete
- [ ] Budget rollover (carry unused amount to next month)
- [ ] Budget notifications / alerts

## Dashboard

- [x] Monthly income / expense / balance KPIs
- [x] Savings rate
- [x] Spending by category (pie / bar chart)
- [x] 6-month income vs expense trend chart
- [x] Recent transactions list
- [x] Account balances overview
- [x] Budget progress overview
- [ ] Customizable widget order

## Reports

- [ ] Monthly report (income, expense, savings by month)
- [ ] Category drill-down (tap category → transactions)
- [ ] Year-over-year comparison
- [ ] Export to CSV

## Settings

- [x] Light / dark theme toggle
- [x] Language switch (Vietnamese / English)
- [x] Category add / edit (name, icon, color)
- [ ] Category delete
- [ ] Currency format preference (symbol position, thousand separator)
- [ ] App PIN / biometric lock

## Data

- [ ] Persistent storage (localStorage or IndexedDB — currently in-memory, resets on refresh)
- [ ] Import from CSV
- [ ] Backup / restore (JSON export + import)

## Mobile UX

- [x] Bottom navigation with center FAB
- [x] Settings screen via header gear icon
- [x] Bottom sheet for forms
- [x] Swipe-to-action on transaction rows
- [x] Swipe-to-action on account rows
- [ ] Pull-to-refresh
- [ ] Haptic feedback on swipe actions

## Desktop UX

- [x] Sidebar navigation
- [x] Inline transaction table
- [x] Hover-reveal edit button on account cards
- [x] Modal for account add / edit
- [x] Drawer for transaction add / edit
- [ ] Keyboard shortcuts (N = new transaction, / = search)
- [ ] Command palette

## i18n

- [x] Vietnamese (default)
- [x] English
- [x] Locale-aware date formatting
- [x] Locale-aware calendar (date picker)
- [ ] Number format per locale (e.g. period vs comma as thousand separator)
