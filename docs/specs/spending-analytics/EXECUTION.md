# Spending Analytics — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — pending
- Phase 1 — Shared contract & API: pending
- Phase 2 — Report range model (web): pending
- Phase 3 — Spending analysis UI (web): pending
- Verification debt: none

## Phase 1 — Shared contract & API

Branch: `spending-analytics/phase-1-shared-api` (off `develop`)

Backend/shared layer nothing downstream can start without — new DTO, route, service math
(comparison ranges, adaptive trend buckets, parent-first category rollup), per PLAN.md →
"Shared Contract and API".

- [ ] `packages/shared/src/dtos/report.dto.ts` — add `spendingAnalysisReportSchema` /
      `SpendingAnalysisReport` (+ `spendingAnalysisReportResponseSchema`): selected +
      comparison ranges, current/previous totals with absolute change and nullable
      percentage change (`null` at zero baseline, `New` label for zero→positive, per
      PLAN.md → "Decisions"), aligned current/comparison trend buckets, parent category
      aggregates with child aggregates/shares/changes/counts, drill-down transactions
      (reuse `reportTransactionRowSchema`). Add a granularity-aware series-point schema
      (`day` | `week` | `month` period, not the existing month-hardcoded
      `reportSeriesPointSchema`) since trend buckets are adaptive (daily ≤31d, weekly
      32–180d, monthly >180d).
- [ ] `packages/shared/src/dtos/report.dto.test.ts` — schema tests for the new DTO
      (zero-baseline `null`/`New` cases, both range shapes).
- [ ] `packages/shared/src/finance.ts` — add pure adaptive trend-bucketing function(s)
      (day/week/month bucket boundaries for a date range) alongside
      `computeFinancialPosition`, so bucketing math is unit-testable independent of
      Supabase. Judgment call: exported as named functions, not folded into
      `computeFinancialPosition`.
- [ ] `packages/shared/src/finance.test.ts` — tests for adaptive bucketing at month-length,
      leap-year, and year boundaries (per PLAN.md → "Verification").
- [ ] `packages/api/src/features/reports/schema.ts` — reuse `reportQuerySchema`
      (`from`/`to`) for the new route; no new query params needed per PLAN.md.
- [ ] `packages/api/src/features/reports/routes.ts` — add
      `reportsRouter.get("/spending-analysis", zValidator("query", reportQuerySchema, ...), controller.getSpendingAnalysisReport)`
      following the existing `/income-expense` and `/financial-position` pattern.
- [ ] `packages/api/src/features/reports/controller.ts` — add
      `getSpendingAnalysisReport(c, query)` (thin HTTP glue, same shape as
      `getIncomeExpenseReport`).
- [ ] `packages/api/src/features/reports/service.ts` — add
      `getSpendingAnalysisReport(userId, from, to)`: derive the comparison range
      server-side (immediately preceding equal-length period; this-month uses
      elapsed-days-capped-to-previous-month-length, custom uses preceding equal inclusive
      calendar days, per PLAN.md → "Decisions"), exclude Transfers/loan-linked/Unexplained
      adjustments from Spending while keeping transfer-fee expense transactions, build
      parent-first category aggregates (root custom categories stand alone, children roll
      into parents, explicit `Uncategorized` bucket for null-category expense
      transactions), call the new `finance.ts` bucketing function for trend series,
      `safeParse` against `spendingAnalysisReportResponseSchema`.
- [ ] `packages/api/src/features/reports/repository.ts` — reuse
      `listReportTransactions`/`listReportCategories`; extend/add a repository read for
      the comparison-range transaction set if the current-range-only reads don't already
      cover it (both ranges fetched server-side per PLAN.md → "Shared Contract and API"
      item 5).
- [ ] `packages/api/src/features/reports/reports.test.ts` — integration tests: range/preset
      resolution at boundaries, transfer/loan/unexplained exclusion, transfer-fee
      inclusion, parent totals = children + direct parent transactions, uncategorized
      bucket visible, cross-user isolation (per PLAN.md → "Verification").

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/shared test` (covers `report.dto.test.ts` + `finance.test.ts`)
- [ ] `pnpm --filter @wallet/api typecheck` (also covers `@wallet/shared`'s exported
      surface, resolved as source via workspace `exports`)
- [ ] `pnpm --filter @wallet/api test` (covers `reports.test.ts`)

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
