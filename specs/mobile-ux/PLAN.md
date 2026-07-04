# Mobile UX Improvements — Plan

Produced via `/grill-me`. All decisions below were explicitly confirmed; do not reinterpret
or expand scope without re-confirming.

## Motivation

Hands-on mobile use surfaced a batch of friction points in the two highest-frequency flows
(logging a transaction, browsing the list) plus the categories management page. This spec
bundles the confirmed fixes with two adjacent backlog items (optimistic updates,
pull-to-refresh) that improve the same mobile-feel.

## Decisions

| # | Item | Decision | Reason |
|---|---|---|---|
| 1 | Autofocus amount | Focus the amount input on mount in `TransactionForm`, **both** platforms | FAB tap is a user gesture, so the mobile keyboard rising with the sheet is acceptable; saves a tap on the most common action |
| 2 | Date off-by-one | Format the selected date from **local** Y/M/D components, not `toISOString()` | `date.toISOString().slice(0,10)` on a local-midnight Date in UTC+7 rolls back one day (click 1st → store 30th) |
| 3 | Zoom-on-focus | Add `maximum-scale=1` to the viewport meta | User chose viewport lock over bumping inputs to 16px; pinch-zoom accessibility cost acknowledged and accepted |
| 4 | Parent in list | Subtitle shows `Parent › Child · Account` **only when the category is nested**; top-level stays `Category · Account` | Full breadcrumb only where it adds information; avoids noise/truncation for top-level categories |
| 5 | Inline amount format | Format thousands separators inside the amount input as you type; remove the separate formatted `<span>` below | Single source of visual truth; caret parks at end (fine for numeric append-entry) |
| 6 | Categories redesign | Direction A: type segmented control (Chi tiêu / Thu nhập), no bordered group boxes, parents as quiet section headers, children as full-width rows with a trailing always-visible star toggle and whole-row edit target. Applied to **both** mobile and desktop variants | Fixes clutter, missing type split, and fiddly favoriting with standard visible affordances; `CategoriesPage` serves both variants, no fork |
| 7 | Optimistic updates | Transactions **only** (add/edit/delete): `onMutate` cancel+snapshot, `onError` rollback, `onSettled` invalidate | Matches the backlog item; the high-frequency post-shopping flow feels instant. Balances/dashboard follow via invalidation |
| 8 | Pull-to-refresh | Custom touch hook (no new dep), on Home + Transactions mobile screens, invalidates that screen's queries | Fits the online-only, minimal-dependency stack |

## Affected files

- **#1, #5** — `packages/web/src/features/transactions/components/TransactionForm.tsx`
  (amount input ~L143–161; new autofocus ref)
- **#2** — `packages/web/src/shared/components/ui/date-picker.tsx` (`handleSelect`, and the
  `new Date(value)` parse for `selected`/`maxDate` if display drifts)
- **#3** — `packages/web/index.html` (viewport meta)
- **#4** — `packages/web/src/features/transactions/components/TransactionRow.tsx` (`subtitle`)
- **#6** — `packages/web/src/features/categories/components/CategoriesPage.tsx`
  (`CategoryGroupBox`, `FavoriteToggle`, page shell); new i18n keys in
  `packages/web/src/core/i18n.tsx`
- **#7** — `packages/web/src/features/transactions/queries.ts` (`useAddTransaction`,
  `useUpdateTransaction`, `useDeleteTransaction`)
- **#8** — new hook under `packages/web/src/shared/hooks/`; wired into the mobile Home and
  Transactions screens (`packages/web/src/layouts/mobile/MobileApp.tsx` +
  `features/transactions/components/MobileTransactions.tsx`)

## Constraints

- Any new UI string gets keys in **both** `VI` and `EN` objects in `core/i18n.tsx`
  (`TranslationKey` is inferred from `VI`, enforcing parity). For the type segmented control,
  existing `dashboard.expense` / `dashboard.income` may be reused rather than adding keys.
- Frontend code via the `react-frontend-developer` skill.
- `terse-commit` before every commit.
- Integration branch: `develop`.

## Non-goals / out of scope

- 16px-input alternative for the zoom fix (viewport lock chosen instead).
- Optimistic updates for subscriptions, accounts, budgets, categories.
- Pull-to-refresh on screens other than Home + Transactions.
- Category search, desktop keyboard shortcuts, and other "Small UX batch" backlog items.

## Open items

None. All decisions resolved during the grill. Two backlog lines get removed as their items
ship: the pull-to-refresh clause in the "Small UX batch" line and the optimistic-updates
"Ideas" line in `docs/BACKLOG.md`.
