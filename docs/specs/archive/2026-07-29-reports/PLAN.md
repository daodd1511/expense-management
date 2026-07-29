# Reports Section — Plan

Produced via /grill-me interview. All decisions below were explicitly confirmed; do not reinterpret or expand scope during implementation.

## Problem

The app needs a dedicated Reports section that gives users a monthly analytical view of income vs expense, with a clear spending breakdown by category and a path from aggregate spending back to the underlying transactions. The design must start with a backend report contract because later reports will support wider ranges such as quarter and year, and the UI should be structured to host additional report types without rewriting navigation or report layout.

## Goals

- Add a new Reports section at `/reports`.
- Reorder mobile bottom navigation to `Home / Accounts / Reports / Other`, keeping the center add-transaction FAB.
- Move non-primary mobile destinations into an `Other` hub page.
- Implement the first reusable report type: `Income vs Expense`.
- Back the report with a backend endpoint from the beginning.
- Keep the first UI monthly, while the backend accepts a reusable `from`/`to` date range.
- Show income, expense, and net totals for the selected month.
- Show an expense pie chart.
- Show expense categories sorted by total amount descending.
- Make category rows collapsible and show the matching transactions inside each category.
- Open the existing transaction edit detail form when a transaction row inside an expanded category is clicked.

## Non-Goals

- No downloadable/exportable reports in v1.
- No quarter/year UI controls in v1.
- No budget variance report in v1.
- No subscriptions report in v1.
- No net worth report in v1.
- No embedded transaction editing form owned by Reports; transaction editing continues to use the existing transaction route overlay.
- No schema migration is planned for v1.

## Product Decisions

- Reports means read-only analytics, not documents or exports.
- V1 report type is named `Income vs Expense`.
- `/reports` is a reports shell that can host more report types later.
- The v1 UI exposes only month selection.
- Backend requests use `from=YYYY-MM-DD&to=YYYY-MM-DD` so quarter/year can reuse the contract later.
- Transfers are excluded from income totals, expense totals, net cashflow, pie chart data, and category breakdowns.
- Transfers are out of scope for the v1 report UI.
- Report category percentages are type-relative:
  - expense category percentage = category expense / total expense
  - income category percentage = category income / total income
- The backend returns both income and expense categories.
- The v1 collapsible category list displays expense categories only.
- Category grouping uses exact transaction category rows. Do not roll child categories into parents in v1.
- Each category aggregate includes enough lightweight transaction rows to render the expanded list for a monthly report.
- Clicking an expanded transaction row navigates to `/transactions/$transactionId/edit` with a `returnTo` back to `/reports`.

## Navigation Changes

### Desktop

- Add Reports to the desktop sidebar in `packages/web/src/layouts/desktop/DesktopApp.tsx`.
- Recommended desktop order:
  - Overview
  - Reports
  - Transactions
  - Budgets
  - Subscriptions
  - Accounts
  - Settings

### Mobile

- Reorder `packages/web/src/layouts/mobile/MobileApp.tsx` bottom navigation to:
  - Home (`/`)
  - Accounts (`/accounts`)
  - Reports (`/reports`)
  - Other (`/other`)
- Keep the center add-transaction FAB.
- Add an `Other` hub page for:
  - Transactions (`/transactions`)
  - Planning (`/subscriptions`, with existing Budgets/Subscriptions inner tabs)
  - Categories (`/settings/categories`)
  - Settings (`/settings`)

## API Changes

Add a reports feature under `packages/api/src/features/reports/`:

- `packages/api/src/features/reports/routes.ts`
- `packages/api/src/features/reports/controller.ts`
- `packages/api/src/features/reports/service.ts`
- `packages/api/src/features/reports/repository.ts`
- `packages/api/src/features/reports/schema.ts`
- `packages/api/src/features/reports/reports.test.ts`

Mount the router in `packages/api/src/app.ts`:

- `api.route('/reports', reportsRouter)`

Add endpoint:

- `GET /api/reports/income-expense?from=YYYY-MM-DD&to=YYYY-MM-DD`

Request rules:

- `from` is required.
- `to` is required.
- Both are date-only strings.
- `from <= to`.
- V1 UI sends month start and month end.
- The backend contract allows wider ranges later.

Repository behavior:

- Query authenticated user's transactions where `tx_date >= from` and `tx_date <= to`.
- Exclude transfers from reportable totals and category aggregates.
- Return only the authenticated user's rows.

Service behavior:

- Compute totals for income, expense, net, and reportable transaction count.
- Compute monthly series entries for every month touched by the range.
- Compute category aggregates for both income and expense categories.
- Sort expense categories by `amount` descending for response stability.
- Include lightweight transaction rows under each category aggregate.
- Validate the final response with the shared response schema before returning.

## Shared Contract Changes

Add report DTOs in `packages/shared/src/dtos/report.dto.ts` and export from:

- `packages/shared/src/dtos/index.ts`
- `packages/shared/src/index.ts`

Response shape:

```ts
type IncomeExpenseReportResponse = {
  data: {
    range: {
      from: string
      to: string
      granularity: 'month'
    }
    totals: {
      income: number
      expense: number
      net: number
      transactionCount: number
    }
    series: Array<{
      period: string
      income: number
      expense: number
      net: number
    }>
    categories: Array<{
      categoryId: string
      parentCategoryId: string | null
      type: 'income' | 'expense'
      amount: number
      transactionCount: number
      percentage: number
      transactions: Array<{
        id: string
        date: string
        merchant: string
        note?: string
        amount: number
        accountId: string
      }>
    }>
  }
}
```

## Web Data Layer Changes

Add reports data files:

- `packages/web/src/features/reports/db.ts`
- `packages/web/src/features/reports/queries.ts`
- `packages/web/src/features/reports/report-types.ts`

Responsibilities:

- `db.ts` calls `/reports/income-expense?from&to` through `apiJson`.
- `queries.ts` exposes `useIncomeExpenseReport({ from, to })`.
- Query key includes user id, report type, `from`, and `to`.
- `report-types.ts` defines the report type registry with one active report: `income-expense`.

## Web UI Changes

Add report components:

- `packages/web/src/features/reports/components/ReportsPage.tsx`
- `packages/web/src/features/reports/components/IncomeExpenseReport.tsx`
- `packages/web/src/features/reports/components/ExpenseCategoryBreakdown.tsx`
- `packages/web/src/features/reports/components/ReportTransactionRow.tsx`

Shadcn/base-ui requirement:

- Use the shadcn MCP during implementation to inspect relevant `@shadcn` registry components before adding or adapting UI primitives.
- Prefer existing repo wrappers under `packages/web/src/shared/components/ui/` when present.
- Expected shadcn-backed surfaces for this feature:
  - `card` for report summary and framed report sections.
  - `tabs` or the existing local tab pattern for the report-type selector.
  - `collapsible` or `accordion` for expandable expense category rows.
  - `chart` patterns for the pie chart if the existing `CategoryDonut` abstraction needs to be extended.
- Do not hand-roll new generic primitives if a matching shadcn/base-ui wrapper already exists or can be added cleanly.

Routing changes:

- `packages/web/src/routing/router.tsx` adds `/reports` and `/other`.
- `packages/web/src/routing/app-pages.tsx` exports `ReportsPage` and `OtherPage`.
- `packages/web/src/routing/app-route-state.ts` recognizes `reports` and `other`.
- Existing transaction overlay return handling must allow `/reports`.

UI behavior:

- `ReportsPage` is a shell with a report-type selector. V1 has one active option: `Income vs Expense`.
- `IncomeExpenseReport` owns month selection and maps month to backend `from`/`to`.
- Use existing date helpers in `packages/web/src/shared/lib/date.ts` and month UI patterns from `TransactionsMonthSwitcher`.
- The report shows:
  - month selector
  - income / expense / net summary
  - expense pie chart
  - collapsible expense categories sorted by amount descending
  - expanded transactions under each category
- Pie chart uses the expense category aggregates.
- Category labels, parent labels, icons, and colors are resolved client-side from existing category lookups.
- Account labels for expanded transactions are resolved client-side from existing account lookups.
- Clicking an expanded transaction row opens `/transactions/$transactionId/edit` with `returnTo` set to the current reports URL.

Internationalization:

- Add vi/en keys in `packages/web/src/core/i18n.tsx` for Reports nav, Other nav, report type labels, totals, empty states, category breakdown, and transaction count copy.

## Empty, Loading, and Error States

- Reports screen uses existing skeleton patterns from `packages/web/src/shared/components/Skeleton.tsx`.
- Empty report state appears when totals are zero and no categories are returned.
- Category list empty state appears when there are no expense categories in the selected month.
- API validation errors use existing API error handling.

## Testing Expectations

Backend:

- Add `packages/api/src/features/reports/reports.test.ts`.
- Cover valid monthly report.
- Cover transfer exclusion.
- Cover both income and expense category aggregates.
- Cover type-relative percentages.
- Cover transaction rows embedded under category aggregates.
- Cover invalid date range rejection.
- Cover ownership isolation.

Shared:

- Add DTO validation coverage if needed near `packages/shared/src/dtos/common.dto.test.ts` or a new report DTO test.

Web:

- Add report query test coverage if matching local patterns are present.
- Add component coverage for:
  - report empty state
  - expense category sorting descending
  - category expand/collapse
  - transaction row click opening edit route
- Update mobile shell tests for reordered bottom nav.

## Open Items

None. Future report types, quarter/year UI, and export/report downloads are intentionally out of v1 scope.
