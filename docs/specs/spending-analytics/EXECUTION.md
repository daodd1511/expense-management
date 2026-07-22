# Spending Analytics — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 3 — done
- Phase 1 — Shared contract & API: done
- Phase 2 — Report range model (web): done
- Phase 3 — Spending analysis UI (web): done
- Verification debt: none (manual in-browser checks moved to PR review checklists — see Phase 2/3 amendments)

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

- [x] `packages/web/src/routing/reports-search.ts` — replaced `reportsSearchSchema`
      (`{ month }`) with `{ preset?, from?, to? }` (reusing `spendingAnalysisPresetSchema`
      from `@wallet/shared`). `validateReportsSearch` normalizes a legacy `month=YYYY-MM`
      search into `{preset: "custom", from, to}` via `monthRangeFromMonth`; a bare search
      with none of preset/from/to/month returns `{}` (`ReportsPage` resolves the default).
- [x] `packages/web/src/features/reports/report-date.ts` — added `resolveReportRange`
      (preset → `{from,to}` as of "today") and `ReportRangePreset`/`ReportRange` types.
      Removed `currentReportMonth`/`formatReportMonth` — both became dead code once
      `ReportsPage` no longer tracks a bare month (confirmed no other callers).
- [x] `packages/web/src/features/reports/components/ReportsPage.tsx` — replaced
      `selectedMonth` state with `range: ReportRange & {preset}` state, synced to the
      router search param via two effects (default-on-bare-visit, sync-on-external-nav);
      `activeType` state unchanged, so range survives report-type switches for free.
- [x] `packages/web/src/routing/router.tsx` — unchanged; `validateSearch` already points
      at `validateReportsSearch`, whose return shape changed but call site didn't.
- [x] `packages/web/src/features/reports/queries.ts` — no changes needed: already typed
      as `{from, to}`, confirmed no callers passed `month`.
- [x] `packages/web/src/features/reports/components/ReportRangeSelector.tsx` — new
      component: preset `Select` + two `DatePicker` instances (reused
      `shared/components/ui/date-picker.tsx`, not a new date input) shown only for
      `custom`, clamping `to >= from` in the parent's own `onChange`.
- [x] `packages/web/src/core/i18n.tsx` — added `reports.range*` keys to both `VI`/`EN`.

**Amendments (2026-07-19):**
- `packages/web/src/features/reports/components/IncomeExpenseReport.tsx` and
  `ExpenseCategoryBreakdown.tsx` — necessary-but-unplanned: `onTransactionClick` only
  passed a transaction id, and the transaction-edit overlay looks the transaction up
  within *its own date's* month (`useTransactions(month)`). That was safe when the
  Reports shell only ever showed a single month; a multi-month preset (e.g. "last 3
  months") would pass the *report's* month instead of the clicked transaction's own
  month, and the overlay would silently fail to find it and close itself. Widened
  `onTransactionClick` to `(transactionId, date)` and derive the overlay month from the
  clicked row's own `date`.
- `packages/web/src/features/reports/components/{IncomeExpenseReport,FinancialPositionReport}.tsx`
  — prop renamed `month: string` → `range: ReportRange`, since `ReportsPage` now resolves
  a range (not a month) — required for both report types to keep working under the new
  shared range-selector shell, per PLAN.md → "Pass the resolved from/to range to all
  Report queries."
- Added `packages/web/src/features/reports/report-date.test.ts` and
  `packages/web/src/routing/reports-search.test.ts` — no test files previously existed
  for either changed file; added coverage for the new range-resolution and
  legacy-month-normalization logic (month-length/leap-year/year-boundary cases).
- Manual in-browser verification of the range selector was not performed: the app is
  gated behind Supabase Auth and no login credentials were available in this session.
  Confirmed only that the dev server boots and serves the SPA shell (`200` on `/` and
  `/reports`). Per this project's own spec-workflow, interactive UI verification is the
  PR review checklist's job (the user's, at review time) — moved there rather than
  treated as agent debt.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` — clean
- [x] `pnpm --filter @wallet/web exec vitest run reports-search report-date.test IncomeExpenseReport FinancialPositionReport`
      (corrected: package has no `test -- <pattern>` passthrough script; ran vitest
      directly with the equivalent file filter) — 16 passed

**Review checklist (user, at PR review):**
- [ ] Each preset (This month, Previous month, last 3/6/12 months, Custom) resolves to
      the expected range in the URL and UI, on both mobile and desktop.
- [ ] A legacy `?month=YYYY-MM` URL still loads the equivalent range.
- [ ] Switching between Income vs Expense / Financial position preserves the selected
      range.
- [ ] Custom range: picking a "from" after the current "to" (or vice versa) clamps
      sensibly rather than producing an inverted range.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Spending analysis UI (web)

Branch: `spending-analytics/phase-3-spending-ui` (off
`spending-analytics/phase-2-range-model`, stacked)

User-visible report type, depends on Phase 1's API and Phase 2's range model both
existing, per PLAN.md → "Web Changes".

- [x] `packages/web/src/features/reports/report-types.ts` — added `"spending-analysis"` to
      `REPORT_TYPE_IDS` and `REPORT_TYPES`.
- [x] `packages/web/src/core/i18n.tsx` — added `reports.typeSpendingAnalysis`,
      `reports.spendingTotal/VsPrevious/New/Unchanged/Uncategorized/TrendTitle/
      CategoriesTitle/EmptyTitle/EmptyDesc/CurrentLabel/PreviousLabel` to both `VI`/`EN`.
- [x] `packages/web/src/features/reports/db.ts` — added `fetchSpendingAnalysis` (`from`,
      `to`, `preset` query params; validates against `spendingAnalysisReportResponseSchema`).
- [x] `packages/web/src/features/reports/queries.ts` — added
      `reportQueryKeys.spendingAnalysis` (keyed by preset+from+to) + `useSpendingAnalysis`.
- [x] `packages/web/src/features/reports/components/SpendingAnalysisReport.tsx` — new
      component: headline card (`SpendingChangeBadge` for change/`New`/`Unchanged`),
      `SpendingTrendChart` (new, in `Charts.tsx`), `SpendingCategoryBreakdown`; drill-down
      via `useTransactionOverlay().openEdit`, deriving the overlay month from the clicked
      row's own date (same fix as Phase 2, not the report's range).
- [x] `packages/web/src/features/reports/components/SpendingCategoryBreakdown.tsx` — new
      component, **not** a reuse/extension of `ExpenseCategoryBreakdown` — see amendment.
- [x] `packages/web/src/features/reports/components/ReportsPage.tsx` — renders
      `SpendingAnalysisReport` when `activeType === "spending-analysis"`.

**Amendments (2026-07-19):**
- `ExpenseCategoryBreakdown`/`ReportTransactionRow` were **not** extended in place: the
  Spending data shape nests children under each parent and carries
  current/previous/change/share instead of a flat amount/percentage, with `categoryId`
  nullable for the explicit Uncategorized bucket — none of which the existing single-
  level component's props express. Built `SpendingCategoryBreakdown.tsx` +
  `SpendingChildCategoryRow` (private, same file) instead, reusing `ReportTransactionRow`
  as-is for leaf rows (the one piece that *did* fit unchanged) plus the same
  `Card`/`Collapsible`/`CategoryIcon` primitives for visual consistency.
- Added `SpendingChangeBadge.tsx` (new, feature-local — no existing delta/trend-badge
  component was found anywhere in the app to reuse) and `SpendingTrendChart` in
  `shared/components/Charts.tsx` (new `ComposedChart`: filled area for the current
  period, dashed line for the comparison period, `connectNulls` so a shorter comparison
  range — the this-month month-capping edge case from Phase 1 — doesn't break the line).
- Manual in-browser verification was again not performed (Supabase-auth-gated, no
  credentials this session) — moved to the review checklist below, consistent with
  Phase 1/2.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` — clean
- [x] `pnpm --filter @wallet/web exec vitest run src/features/reports src/routing/reports-search.test.ts`
      (corrected: package has no `test -- <pattern>` passthrough script, same correction
      as Phase 2; widened to the whole `reports` feature since this phase's diff touches
      `report-types.ts`/`queries.ts`/`ReportsPage.tsx`, not just the new files) — 22 passed

**Review checklist (user, at PR review):**
- [ ] Spending analysis shows correct headline/trend/category data against real
      transactions, on mobile and desktop, across all range presets.
- [ ] Uncategorized bucket appears and is drillable; parent totals visually reconcile
      with children.
- [ ] Category names remain localized through the existing category cache.
- [ ] Another user's data never leaks into the report (spot-check via two test accounts
      if available).
- [ ] The trend chart's dashed comparison line handles a this-month range where the
      comparison period is shorter (e.g. viewing on the 31st of a month whose previous
      month only has 30 days) without visually breaking.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
