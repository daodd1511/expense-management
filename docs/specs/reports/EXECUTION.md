# Reports Section — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` -> "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 3 — done
- Phase 1 — Shared contract and reports API: done
- Phase 2 — Web reports data layer and navigation shell: done
- Phase 3 — Income vs Expense report UI: done
- Verification debt: all 3 phases landed in one commit (21cb284), merged directly to `develop` (fast-forward, no PR) instead of the stacked phase-2/phase-3 branches this plan calls for. Two Phase 2/3 bullets describe the original route-based transaction overlay, superseded post-hoc by a context-based `TransactionOverlayProvider` in the same commit (see inline notes). All agent gates re-verified passing; all Review checklist items below remain unverified — no browser automation or live Supabase session available in this environment to drive the app.

## Phase 1 — Shared contract and reports API

Branch: `reports/phase-1-api-contract` (off `develop`, stacked)

This phase establishes the backend and shared DTO contract that every frontend report surface depends on.

- [x] Add `packages/shared/src/dtos/report.dto.ts` with the `IncomeExpenseReportResponse` schema from `PLAN.md`, including `range`, `totals`, `series`, and `categories[].transactions`.
- [x] Export the report DTOs from `packages/shared/src/dtos/index.ts` and `packages/shared/src/index.ts`.
- [x] Add `packages/api/src/features/reports/schema.ts` to validate `from` and `to` query parameters as required date-only strings with `from <= to`.
- [x] Add `packages/api/src/features/reports/repository.ts` to fetch authenticated-user transactions where `tx_date >= from` and `tx_date <= to`.
- [x] Add `packages/api/src/features/reports/service.ts` to compute income, expense, net, reportable transaction count, monthly `series`, type-relative category percentages, and lightweight transaction rows while excluding transfers from report totals and category aggregates.
- [x] Add `packages/api/src/features/reports/controller.ts` for `GET /api/reports/income-expense?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- [x] Add `packages/api/src/features/reports/routes.ts` and mount `reportsRouter` in `packages/api/src/app.ts` with `api.route('/reports', reportsRouter)`.
- [x] Add `packages/api/src/features/reports/reports.test.ts` covering valid monthly report data, transfer exclusion, both income and expense category aggregates, type-relative percentages, embedded category transaction rows, invalid date range rejection, and ownership isolation.
- [x] Add shared DTO validation coverage for `packages/shared/src/dtos/report.dto.ts` in a report DTO test file if the response schema has non-trivial validation branches.

**Agent gate (hard):**

- [x] `pnpm typecheck`
- [x] `pnpm --filter @wallet/shared test`
- [x] `pnpm --filter @wallet/api typecheck`
- [x] `pnpm --filter @wallet/api test`
- [x] `pnpm --filter @wallet/api build`

**Review checklist (user, at PR review):**

- [ ] Review the API response shape for `GET /api/reports/income-expense?from=YYYY-MM-DD&to=YYYY-MM-DD` and confirm it still matches the planned reusable report contract.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — Web reports data layer and navigation shell

Branch: `reports/phase-2-web-shell` (off `reports/phase-1-api-contract`, stacked)

This phase wires the new report endpoint through the web app and creates the route/navigation structure before building the report visualization.

- [x] Add `packages/web/src/features/reports/db.ts` to call `/reports/income-expense?from&to` through `apiJson` using the shared report response schema.
- [x] Add `packages/web/src/features/reports/queries.ts` with `useIncomeExpenseReport({ from, to })`, keyed by user id, report type, `from`, and `to`.
- [x] Add `packages/web/src/features/reports/report-types.ts` with an active `income-expense` report type registry entry.
- [x] Add a lightweight `packages/web/src/features/reports/components/ReportsPage.tsx` shell with a report-type selector containing the single `Income vs Expense` option.
- [x] Add `ReportsPage` and `OtherPage` exports in `packages/web/src/routing/app-pages.tsx`.
- [x] Add `/reports` and `/other` routes in `packages/web/src/routing/router.tsx`.
- [x] Update `packages/web/src/routing/app-route-state.ts` to recognize `reports` and `other`.
- [x] Update transaction overlay return handling so `/reports` is allowed as a `returnTo` target for `/transactions/$transactionId/edit`. _(Superseded in the same commit: route-based overlay removed entirely, replaced by `features/transactions/transaction-overlay.tsx`'s `TransactionOverlayProvider`/`useTransactionOverlay` context — no more `returnTo`/route.)_
- [x] Update `packages/web/src/layouts/desktop/DesktopApp.tsx` to add Reports to the sidebar between Overview and Transactions.
- [x] Update `packages/web/src/layouts/mobile/MobileApp.tsx` bottom navigation to `Home / Accounts / Reports / Other`, keeping the center add-transaction FAB.
- [x] Add the `Other` hub page in the web routing layer with links to Transactions, Planning (`/subscriptions`), Categories (`/settings/categories`), and Settings.
- [x] Add vi/en i18n keys in `packages/web/src/core/i18n.tsx` for Reports nav, Other nav, report type labels, and Other hub entries.
- [x] Update `packages/web/src/layouts/mobile/MobileApp.test.tsx` for the reordered mobile bottom navigation.

**Agent gate (hard):**

- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**

- [ ] On mobile, confirm bottom nav order is Home / Accounts / Reports / Other and the center add button still opens the add-transaction sheet.
- [ ] On mobile, confirm Other links to Transactions, Planning, Categories, and Settings.
- [ ] On desktop, confirm Reports appears in the sidebar between Overview and Transactions.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 3 — Income vs Expense report UI

Branch: `reports/phase-3-income-expense-ui` (off `reports/phase-2-web-shell`, stacked)

This phase builds the actual v1 report experience on top of the API and route shell already landed.

- [x] Add `packages/web/src/features/reports/components/IncomeExpenseReport.tsx` to own month selection, convert the selected month to backend `from`/`to`, call `useIncomeExpenseReport`, and render income, expense, and net summary totals.
- [x] Add `packages/web/src/features/reports/components/ExpenseCategoryBreakdown.tsx` to render expense categories sorted by `amount` descending as collapsible rows.
- [x] Add `packages/web/src/features/reports/components/ReportTransactionRow.tsx` to render the lightweight transactions embedded in each category aggregate.
- [x] Wire `ReportsPage.tsx` to render `IncomeExpenseReport` for the active `income-expense` report type.
- [x] Use the shadcn MCP before implementing report UI primitives: inspect `@shadcn/card`, `@shadcn/tabs`, `@shadcn/collapsible` or `@shadcn/accordion`, and `@shadcn/chart`; prefer existing wrappers in `packages/web/src/shared/components/ui/` and add/adapt shadcn-backed wrappers only where missing.
- [x] Use `CategoryDonut` from `packages/web/src/shared/components/Charts.tsx` for the expense pie chart, mapping expense category aggregates to category labels, icons, and colors via existing category lookups.
- [x] Resolve account labels for expanded transaction rows through existing account lookups.
- [x] On transaction row click, navigate to `/transactions/$transactionId/edit` with `returnTo` set to the current Reports URL so the existing transaction edit overlay opens and returns correctly. _(Superseded: row click now calls `openEdit(transactionId, month)` on the `TransactionOverlayProvider` context directly — no navigation, no route, no `returnTo`. The underlying Reports page no longer unmounts while the form is open.)_
- [x] Add Reports loading and empty states using existing skeleton/state patterns from `packages/web/src/shared/components/Skeleton.tsx`.
- [x] Add vi/en i18n keys in `packages/web/src/core/i18n.tsx` for report totals, empty states, category breakdown, transaction count copy, and expand/collapse labels.
- [x] Add or update report component tests covering report empty state, expense category sorting descending, category expand/collapse, and transaction row click opening the edit route.

**Agent gate (hard):**

- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**

- [ ] Open Reports on mobile and desktop and confirm the default month is the current local month.
- [ ] Change months and confirm the totals, pie chart, and category list update together.
- [ ] Expand an expense category and confirm its transactions appear under the category row.
- [ ] Click an expanded transaction and confirm the existing transaction edit detail opens, then returns to Reports on close.
- [ ] Confirm months with no expense categories show an empty state instead of a broken chart/list.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.
