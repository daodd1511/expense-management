# Spending Analytics — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — done
- Phase 1 — Shared contract & API: done
- Phase 2 — Report range model (web): pending
- Phase 3 — Spending analysis UI (web): pending
- Verification debt: none

## Phase 1 — Shared contract & API

Branch: `spending-analytics/phase-1-shared-api` (off `develop`)

Backend/shared layer nothing downstream can start without — new DTO, route, service math
(comparison ranges, adaptive trend buckets, parent-first category rollup), per PLAN.md →
"Shared Contract and API".

- [x] `packages/shared/src/dtos/report.dto.ts` — added `spendingAnalysisPresetSchema`,
      `spendingChangeSchema`, `spendingTrendGranularitySchema`, `spendingTrendPointSchema`
      (with nullable `comparisonPeriodStart`/`End` — see amendment below),
      `spendingCategoryChildAggregateSchema`, `spendingCategoryAggregateSchema`,
      `spendingAnalysisReportSchema` / `spendingAnalysisReportResponseSchema`.
      `changePercentage` is `null` at a zero baseline with positive current spending,
      `0` when both are zero (`spendingChangeSchema`, reused for totals and both
      category-aggregate levels).
- [x] `packages/shared/src/dtos/report.dto.test.ts` — schema tests: zero-baseline `null`
      case, both-zero case, nullable comparison-period trend point, uncategorized bucket.
- [x] `packages/shared/src/finance.ts` — added `computeSpendingComparisonRange` (3 rules:
      custom = preceding N days, this-month = month-capped day-count, whole-month presets
      = N preceding whole calendar months — see amendment below),
      `resolveSpendingTrendGranularity`, `buildSpendingTrendBuckets` (sequential
      fixed-size day chunks from range start — see amendment below), `computeSpendingChange`.
- [x] `packages/shared/src/finance.test.ts` — tests for comparison-range rules at
      month-length, leap-year, and year boundaries; granularity thresholds; bucket
      chunking; zero-baseline change cases.
- [x] `packages/api/src/features/reports/schema.ts` — added `spendingAnalysisQuerySchema`
      (`from`/`to`/`preset`, own `superRefine`) — **amended**, see below.
- [x] `packages/api/src/features/reports/routes.ts` — added
      `GET /spending-analysis` following the existing `/income-expense` and
      `/financial-position` pattern.
- [x] `packages/api/src/features/reports/controller.ts` — added
      `getSpendingAnalysisReport(c, query)` (thin HTTP glue).
- [x] `packages/api/src/features/reports/service.ts` — added
      `getSpendingAnalysisReport(userId, from, to, preset)`: derives the comparison range
      via `finance.ts`, filters to expense transactions excluding the "Balance Adjustment"
      system category (checked inline against fetched categories, same pattern as
      `getIncomeExpenseReport` — see amendment below), builds parent-first category
      aggregates (root categories stand alone, children roll into parents, explicit
      `Uncategorized` bucket for null `categoryId`), builds trend buckets via
      `finance.ts`, `safeParse`s against `spendingAnalysisReportResponseSchema`.
- [x] `packages/api/src/features/reports/repository.ts` — no changes needed: existing
      `listReportTransactions`/`listReportCategories` sufficed (see amendment below).
- [x] `packages/api/src/features/reports/reports.test.ts` — integration tests: transfer/
      loan/balance-adjustment exclusion with transfer-fee inclusion, parent-child rollup,
      uncategorized bucket, custom comparison-range math, cross-user isolation, inverted
      range and invalid preset rejection.

**Amendments (2026-07-19):**
- Added an explicit `preset` query param (`spendingAnalysisPresetSchema`) instead of
  reusing `reportQuerySchema` as-is — necessary because This-month's comparison rule
  (month-capped day count) and Custom's rule (plain preceding N days) produce different
  results in the edge case where elapsed days exceed the previous month's length, and the
  server has no other way to know which rule to apply. Confirmed with the user before
  implementing (see session).
- Trend-bucket alignment uses fixed-size day chunks (1/7/30 days) counted from each
  range's own start, not calendar week/month boundaries — confirmed with the user, since
  calendar-boundary buckets would not generally produce equal bucket counts between the
  current and comparison ranges. `comparisonPeriodStart`/`End` on a trend point are
  nullable to cover This-month's edge case where the (month-capped) comparison range is
  shorter than the current range.
- Dropped the separate `listBalanceAdjustmentCategoryIds()` repository call originally
  planned: the shared integration-test mock returns one unfiltered dataset per table
  regardless of query predicates, so a second query against `categories` silently
  clobbered the first. Switched to the same inline `isHidden && name === "Balance
  Adjustment"` check `getIncomeExpenseReport` already uses against categories fetched via
  `listReportCategories` — simpler and makes `repository.ts` need no changes at all.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/shared test` (covers `report.dto.test.ts` + `finance.test.ts`)
      — 108 passed
- [x] `pnpm --filter @wallet/api typecheck` (also covers `@wallet/shared`'s exported
      surface, resolved as source via workspace `exports`) — clean
- [x] `pnpm --filter @wallet/api exec vitest run src/features/reports/reports.test.ts`
      (corrected 2026-07-19: `pnpm --filter @wallet/api test` runs the whole package and
      hits 5 pre-existing failures in `analytics.test.ts`/`transactions.test.ts` unrelated
      to this phase — narrowed to the actual changed test file) — 10 passed

**Review checklist (user, at PR review):**
- [ ] `GET /reports/spending-analysis?from=...&to=...` returns correct totals/trend/
      category aggregates against real data for a This month range and a Custom range.
- [ ] Zero-baseline transitions render `New`/`null%` correctly in the raw response.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Report range model (web)

Branch: `spending-analytics/phase-2-range-model` (off `spending-analytics/phase-1-shared-api`,
stacked)

Frontend URL-backed range infra nothing in Phase 3's UI can start without; also touches
the shared Reports shell used by the two existing report types, per PLAN.md → "Report
Range Model".

- [ ] `packages/web/src/routing/reports-search.ts` — replace/extend
      `reportsSearchSchema` (`{ month }`) with a range-capable schema carrying
      `preset` (`this-month` | `previous-month` | `last-3-months` | `last-6-months` |
      `last-12-months` | `custom`) and `from`/`to` (`isoDateSchema`, required together for
      `custom`). Update `validateReportsSearch` to normalize a legacy `month=YYYY-MM`
      search into the equivalent range (backwards compatibility per PLAN.md → "Report
      Range Model" item 2).
- [ ] `packages/web/src/features/reports/report-date.ts` — add range-resolution helpers
      (preset → `{from,to}`, comparison-range derivation mirroring the server logic from
      Phase 1 for client-side display) alongside the existing `monthRangeFromMonth`/
      `currentReportMonth`/`formatReportMonth` (keep the latter for month-only legacy
      paths if still referenced).
- [ ] `packages/web/src/features/reports/components/ReportsPage.tsx` — replace the
      `selectedMonth` `useState` + `getSearchMonth`/`handleMonthChange` (lines ~33–54)
      with the new range state synced to the router search param; keep `activeType` state
      and range selection stable across `Report type` switches (per PLAN.md → "Web
      Changes" item 1, "Verification" → "Switching Report types preserves the selected
      range").
- [ ] `packages/web/src/routing/router.tsx` (`reportsRoute`, ~line 164) —
      `validateSearch` continues to point at the updated `validateReportsSearch`.
- [ ] `packages/web/src/features/reports/queries.ts` — update
      `useIncomeExpenseReport`/`useFinancialPosition` param shape if the range model
      changes what `ReportsPage` passes down (from `month` to `{from,to}` — these hooks
      already accept `from`/`to` per the existing API contract, so this is likely a
      call-site change only).
- [ ] Add the range selector UI (desktop + mobile) to `ReportsPage.tsx` or a new
      `components/ReportRangeSelector.tsx`: preset dropdown/tabs + custom local-date
      inputs (reuse `packages/web/src/shared/lib/date.ts` local-date helpers, never
      `new Date(iso)` per `CLAUDE.md` → "Dates").
- [ ] `packages/web/src/core/i18n.tsx` — add range-preset labels to both `VI` and `EN`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test -- reports-search report-date ReportsPage` (filtered
      to changed test files/areas; extend the filter list if new test files are added)

**Review checklist (user, at PR review):**
- [ ] Each preset (This month, Previous month, last 3/6/12 months, Custom) resolves to
      the expected range in the URL and UI, on both mobile and desktop.
- [ ] A legacy `?month=YYYY-MM` URL still loads the equivalent range.
- [ ] Switching between Income vs Expense / Financial position preserves the selected
      range.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Spending analysis UI (web)

Branch: `spending-analytics/phase-3-spending-ui` (off
`spending-analytics/phase-2-range-model`, stacked)

User-visible report type, depends on Phase 1's API and Phase 2's range model both
existing, per PLAN.md → "Web Changes".

- [ ] `packages/web/src/features/reports/report-types.ts` — add `"spending-analysis"` to
      `REPORT_TYPE_IDS` and `REPORT_TYPES` (new `labelKey`/`descriptionKey`).
- [ ] `packages/web/src/core/i18n.tsx` — add `reports.typeSpendingAnalysis` /
      `reports.typeSpendingAnalysisDesc` (+ any in-report copy: `New`, `Uncategorized`,
      change labels) to both `VI` and `EN`.
- [ ] `packages/web/src/features/reports/db.ts` — add `fetchSpendingAnalysis` (`apiJson`
      wrapper against `spendingAnalysisReportResponseSchema` from Phase 1, GET
      `/reports/spending-analysis`).
- [ ] `packages/web/src/features/reports/queries.ts` — add
      `reportQueryKeys.spendingAnalysis` + `useSpendingAnalysis(params)`.
- [ ] `packages/web/src/features/reports/components/SpendingAnalysisReport.tsx` — new
      component: headline spending + absolute/percentage change (`New`/`null%` display
      per Phase 1's DTO), adaptive current-vs-previous trend chart (reuse
      `packages/web/src/shared/components/Charts.tsx` per `CLAUDE.md` → Stack →
      Recharts), parent category share/change list with expand-to-children, wired to
      `packages/web/src/features/transactions/transaction-overlay.tsx`
      `useTransactionOverlay().openEdit(...)` for drill-down (same pattern as
      `IncomeExpenseReport.tsx`).
- [ ] `packages/web/src/features/reports/components/ExpenseCategoryBreakdown.tsx` /
      `ReportTransactionRow.tsx` — reuse as-is or extend minimally for the
      parent-then-children-then-transactions drill-down shape; note any divergence
      inline if a variant is needed rather than forking wholesale.
- [ ] `packages/web/src/features/reports/components/ReportsPage.tsx` — render
      `SpendingAnalysisReport` when `activeType === "spending-analysis"`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test -- SpendingAnalysisReport queries report-types`
      (filtered to new/changed test files)

**Review checklist (user, at PR review):**
- [ ] Spending analysis shows correct headline/trend/category data against real
      transactions, on mobile and desktop, across all range presets.
- [ ] Uncategorized bucket appears and is drillable; parent totals visually reconcile
      with children.
- [ ] Category names remain localized through the existing category cache.
- [ ] Another user's data never leaks into the report (spot-check via two test accounts
      if available).

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
