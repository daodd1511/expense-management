# Feature UX — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: All phases complete
- Phase 1 — Server balances + analytics API: done
- Phase 2 — Web data hooks + account balance migration: done
- Phase 3 — Transaction month switcher + filters: done
- Phase 4 — Dashboard analytics wiring + drill-down: done
- Phase 5 — Category picker tiles + icon/color expansion: done
- Verification debt: none

## Phase 1 — Server balances + analytics API

Branch: `feature-ux/phase-1-server-balances-analytics` (off `develop`, stacked)

Backend and shared-contract work lands first so the frontend can consume stable payloads without duplicating aggregation logic.

- [x] Extend `packages/shared/src/models/account.model.ts` and its exports in `packages/shared/src/index.ts` so account payloads may carry a computed `balance` field while keeping `openingBalance` for edits; added shared `packages/shared/src/finance.ts` to host the reusable balance and monthly-total reducers.
- [x] Add shared analytics DTOs in `packages/shared/src/dtos/analytics.dto.ts` and export them from `packages/shared/src/dtos/index.ts` / `packages/shared/src/index.ts`.
- [x] Update `packages/api/src/routes/accounts.ts` `GET /` to fetch the user's transactions, compute each account balance with the shared `computeBalance` reducer, and return the existing `/accounts` list payload shape with `balance` embedded on each item.
- [x] Add `packages/api/src/routes/analytics.ts` with `GET /monthly-totals`, aggregate monthly income and expense for the authenticated user, and register the route in `packages/api/src/index.ts`.
- [x] Add or extend route coverage in `packages/api/src/routes/accounts.test.ts` and new `packages/api/src/routes/analytics.test.ts` for computed balances and month aggregation.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck`
- [x] `pnpm --filter @wallet/api test`
- [x] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**
- [ ] Accounts payload now includes both `openingBalance` and computed `balance`, and the numbers match the current transaction history.
- [ ] `GET /api/analytics/monthly-totals` returns the expected month buckets for a user with mixed income and expense history.
- [ ] No account or analytics data leaks across users.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — Web data hooks + account balance migration

Branch: `feature-ux/phase-2-web-data-hooks` (off `feature-ux/phase-1-server-balances-analytics`, stacked)

This phase rewires the web data layer to the new backend contracts before changing transaction-screen UI behavior.

- [x] Update `packages/web/src/features/accounts/db.ts` and `packages/web/src/features/accounts/queries.ts` so the web accepts account `balance` from `/accounts`, while keeping account create/update payloads scoped to `openingBalance`.
- [x] Remove client-side balance reduction from `packages/web/src/features/accounts/components/AccountList.tsx`, `DesktopAccounts.tsx`, and `MobileAccounts.tsx`; account rollups now use the server-provided `balance` field.
- [x] Update `packages/web/src/features/transactions/db.ts` and `packages/web/src/features/transactions/queries.ts` so `useTransactions(month)` forwards the API's `?month=` filter and keys the cache by selected month, defaulting to `todayLocalMonthIso()`.
- [x] Add a dashboard analytics client in `packages/web/src/features/dashboard/db.ts` and `packages/web/src/features/dashboard/queries.ts` for `/analytics/monthly-totals`.
- [x] Update `packages/web/src/features/transactions/queries.test.tsx` to lock month-scoped fetching and month-keyed optimistic cache behavior.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] Accounts screens still render the same balances after the source of truth moves from client reduction to the API payload.
- [ ] Refreshing or revisiting the transactions screen only fetches the current month by default.
- [ ] Existing non-transaction screens still load without regressions after the query-key changes.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 3 — Transaction month switcher + filters

Branch: `feature-ux/phase-3-transaction-filters` (off `feature-ux/phase-2-web-data-hooks`, stacked)

The transactions screen becomes the owner of selected-month and filter state once the underlying query supports month-scoped data.

- [x] Add a shared month-switcher control in `packages/web/src/features/transactions/components/TransactionsMonthSwitcher.tsx` and wire URL-backed transaction search state into `packages/web/src/routing/app-pages.tsx` so the selected month is shared by `DesktopTransactionsTable.tsx`, `MobileTransactions.tsx`, and the transaction overlay return path.
- [x] Update `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx` to fetch by selected month and apply client-side filters for type, text, category, and account in the toolbar.
- [x] Update `packages/web/src/features/transactions/components/MobileTransactions.tsx` to fetch by selected month and match the desktop filter set, with the month switcher above the filter chips and extra account/category filters in the mobile flow.
- [x] Add new i18n strings for month navigation and category/account filter labels to `packages/web/src/core/i18n.tsx` with vi/en parity.
- [x] Maintain automated coverage via the updated month-scoped transaction query tests and the existing transaction route/form/component suite, which passed after the screen rewiring.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] Desktop transactions toolbar can move backward and forward by month and the list refetches accordingly.
- [ ] Mobile transactions exposes the same month, type, text, category, and account filtering capabilities without breaking pull-to-refresh.
- [ ] Moving to a prior month no longer requires loading the full transaction history.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 4 — Dashboard analytics wiring + drill-down

Branch: `feature-ux/phase-4-dashboard-analytics` (off `feature-ux/phase-3-transaction-filters`, stacked)

Once month scoping and transaction filters exist, the dashboard can switch from seed data to real aggregates and deep-link into filtered transactions.

- [x] Replace `monthlyTrend` seed usage in `packages/web/src/features/dashboard/components/DesktopDashboard.tsx` and `MobileHome.tsx` with the analytics query added in Phase 2.
- [x] Update `packages/web/src/shared/components/Charts.tsx` so `TrendChart` and `CategoryDonut` render real analytics/category data without hardcoded income/expense labels and support category drill-down interactions.
- [x] Wire donut/category interactions from `DesktopDashboard.tsx` and `MobileHome.tsx` through `packages/web/src/routing/app-pages.tsx` into the Phase 3 transaction filters so selecting a category opens the transaction list with the matching current-month + category search state.
- [x] Remove obsolete dashboard trend seed data from `packages/web/src/core/data.ts`.
- [x] Cover the dashboard rewrite with the existing web test/build gate after the chart, routing, and shared-data changes.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] Dashboard trend charts reflect live server totals rather than static seed values.
- [ ] Tapping or clicking a category on the donut takes you to the transactions view with the matching month and category filter already active.
- [ ] Mobile and desktop dashboards stay visually intact after the chart and navigation changes.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 5 — Category picker tiles + icon/color expansion

Branch: `feature-ux/phase-5-category-picker-icons` (off `feature-ux/phase-4-dashboard-analytics`, stacked)

This last phase is UI-only polish on category selection and customization, independent from the data and analytics pipeline.

- [x] Replace the favorites append behavior in `packages/web/src/features/categories/components/FavoriteCategoryPicker.tsx` with a compact favorite tile grid, while keeping a full-width selected-row indicator for non-favorite categories chosen from "show all".
- [x] Keep the grouped modal picker flow in `packages/web/src/features/categories/components/CategoryPicker.tsx`, updating only the favorite-surface selection display.
- [x] Consolidate icon definitions into a single shared registry in `packages/web/src/shared/icons.ts` and update `packages/web/src/shared/components/CategoryIcon.tsx` and `packages/web/src/features/categories/components/CategoryForm.tsx` to consume it.
- [x] Expand `CategoryForm.tsx` color options from the current subset to the full `chart-1` through `chart-12` token set already defined in `packages/web/src/shared/styles/globals.css`.
- [x] Add or update tests for favorite-category selection, icon registry usage, and color/icon picker rendering in `FavoriteCategoryPicker.test.tsx` and new `CategoryForm.test.tsx`.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] Favorite categories render as compact tiles, selected favorites highlight clearly, and a non-favorite selection still appears as a full-width selected row.
- [ ] Category creation/editing exposes the expanded icon set and all 12 chart colors in both light and dark themes.
- [ ] Existing category picker grouping and modal behavior remain intact.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.
