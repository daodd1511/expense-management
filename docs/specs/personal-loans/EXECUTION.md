# Personal Loans — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 2 — done
- Phase 1 — Persistence and loan lifecycle API: done
- Phase 2 — Financial position and dashboard API: done
- Phase 3 — Web loan data layer: pending
- Phase 4 — Responsive Loans UI: pending
- Phase 5 — App integration: pending
- Verification debt: none

Mode: goal.

## Phase 1 — Persistence and loan lifecycle API

Branch: `personal-loans/phase-1-persistence-lifecycle` (off `develop`, stacked)

Establish the authoritative loan/event ledger, shared contracts, and atomic lifecycle operations before clients consume them.

- [x] Add `supabase/migrations/20260713000000_personal_loans.sql` for `loan_people`, `loans`, `loan_events`, transaction loan fields, constraints/indexes, cascades, and ownership-validating RPCs per PLAN.md → "Persistence Model" and "Mutation Ownership and Atomicity". No RLS: this project enforces ownership entirely at the API layer for every table (the API always connects with the service-role key, which bypasses RLS regardless), confirmed with the user during execution rather than adding an inert policy layer.
- [x] Add Person, Loan, LoanEvent, derived summary/detail contracts and loan transaction contracts in `packages/shared/src/models/`, `dtos/`, `mappers/`, `database.types.ts`, and exports; add event/state calculations in `finance.ts`. Transaction's loan fields (`cashFlowDirection`, `loanEventId`) stay on the existing flat `transactionSchema` object with a `superRefine` cross-field check, not a `z.discriminatedUnion` — matches how transfer's `toAccountId`/`fee` are already modeled and avoids restructuring every existing Transaction consumer across the app for a phase-1-only file scope; the functional guarantee (invalid field combinations rejected) is the same either way.
- [x] Add `packages/api/src/features/loans/{routes,controller,service,repository,schema}.ts`, wire it in `packages/api/src/app.ts`, and implement person, loan, origin, repayment, closure, reopen, and deletion operations through the RPCs. `loansRouter` (`/api/loans`) and `peopleRouter` (`/api/people`) both come from `loans/routes.ts`. GET/mutation endpoints take a required `today` query param (client's local calendar date, same rationale as subscriptions) for due-soon/overdue status. (amended) Fixed a real, pre-existing, app-wide bug found while verifying this: Hono's dispatcher only routes thrown values to `onError` when `instanceof Error` (`node_modules/hono/dist/compose.js`), but every repository's `if (error) throw error` throws a raw supabase-js PostgrestError, which is a plain object, not an Error instance — it was silently escaping `handleError` as an unhandled rejection instead of producing a mapped JSON response, for every feature, not just loans. Fixed once in `middleware/error.ts`'s previously-no-op `errorMiddleware`. Also added P0002 (not-found) -> 404 and 22023 (domain validation) -> 400 mappings to `mapDbError`, needed so the loan RPCs' raised messages (overpay, closed loan, wrong closure kind, etc.) surface correctly per PLAN.md's error-states section instead of a generic 500.
- [x] Guard generic loan transaction creation and linked-row patch/delete/bulk-delete in `packages/api/src/features/transactions/{schema,service,repository}.ts`. Create: `transactionCreateSchema` refines the shared schema to reject `type: 'loan'`. Patch/delete/bulk-delete: `repository.listLoanLinkedIds` checks the target id(s) for a non-null `loan_event_id` before mutating; any match (including a mixed bulk selection) throws a 409 directing the client to Loans, checked before the not-found path so a loan-linked id never falls through to a generic 404.
- [x] Add focused shared and API lifecycle coverage in `packages/shared/src/{dtos/loan.dto.test.ts,finance.test.ts}` and `packages/api/src/features/{loans/loans.test.ts,transactions/transactions.test.ts}`. Also extended `packages/shared/src/dtos/transaction.dto.test.ts` for `transactionSchema`'s loan-field `superRefine` (item 2's contract, no dedicated model test file existed to put it in). All new API-layer tests mock `getSupabase` (existing convention); every behavior was additionally verified live against the real database beforehand (see items 3-4's notes) so the mocked tests are regression coverage, not first-time verification.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/shared exec tsc --noEmit && pnpm --filter @wallet/api typecheck`
- [ ] `pnpm --filter @wallet/shared exec vitest run src/dtos/loan.dto.test.ts src/finance.test.ts && pnpm --filter @wallet/api exec vitest run src/features/loans/loans.test.ts src/features/transactions/transactions.test.ts`

**Review checklist (user, at PR review):**
- [ ] Create lending, borrowing, and opening loans; verify their events and linked account transactions are created or omitted as specified.
- [ ] Attempt generic editing/deleting of a loan transaction and confirm the UI directs the user to Loans.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — Financial position and dashboard API

Branch: `personal-loans/phase-2-financial-position` (off `personal-loans/phase-1-persistence-lifecycle`, stacked)

Build historical loan-aware accounting and API summaries on the completed event ledger.

- [x] Extend `packages/shared/src/dtos/report.dto.ts`, `models/`, `mappers/`, and `finance.ts` with Financial Position, net-worth, and reconciliation contracts/calculations per PLAN.md → "Accounting and Reports". `computeFinancialPosition` proves both equations by computing the closing boundary two independent ways (direct snapshot vs. opening + period flows) and comparing them (`reconciliation.{accountTotal,netWorth}.matches`). (amended) Fixed a real bug this item's math depends on: `applyTransaction` in `finance.ts` didn't handle `type: 'loan'` at all — it fell through to the transfer branch, which always subtracted regardless of `cashFlowDirection`, so a borrowing disbursement (should be +amount) would have been silently applied as −amount to the account balance. This was PLAN.md's own explicit requirement ("computeBalance and running-balance logic apply loan inflows/outflows to the linked account") missed in phase 1's shared-contracts item. Fixed in `finance.ts`; verified with new `computeBalance` tests for both cash-flow directions.
- [x] Add `GET /api/reports/financial-position` in `packages/api/src/features/reports/{routes,controller,schema,service,repository}.ts`, including from-exclusive/to-inclusive loan-event state and both reconciliation equations. Reuses the existing `reportQuerySchema` (already validates `from <= to`) rather than a new schema. (amended) Found and fixed a second, more severe pre-existing bug while verifying this: `packages/shared/src/mappers/transaction.mapper.ts`'s `toTransaction`/`fromTransaction` were never updated in phase 1 to carry `cashFlowDirection`/`loanEventId` between row and model, and `transactionRowSchema` (dto layer) didn't have the row columns either — so every loan transaction returned by the API has had `cashFlowDirection: undefined` since phase 1, silently defeating this phase's `applyTransaction` fix (any loan transaction, including borrowing inflows, was applied as an outflow). Fixed both the row schema and both mapper directions; verified live that account balances now correctly credit a borrowing disbursement.
- [x] Update income/expense, analytics, and account-balance paths in `packages/api/src/features/{reports,analytics,transactions,accounts}/` to handle `loan` explicitly and keep principal outside income/expense analytics. `reports/service.ts`'s income/expense filter changed from `type !== 'transfer'` to an explicit `income | expense` type-predicate filter, so loan rows can no longer fall into the expense branch. Accounts and transactions' balance paths needed no code change — both already call the now-fixed shared `computeBalance`/`computeRunningBalances`; verified live that `/api/accounts` correctly reflects a loan disbursement's account-balance effect. Analytics is covered by the next item.
- [x] Add loan/net-worth dashboard summaries to `packages/api/src/features/analytics/{service,repository,controller,routes}.ts`. Added `computeNetWorthSnapshot`, `computeLoansSummary`, and `computeNetWorthTrend` to `finance.ts` (net worth = account total + lending outstanding − borrowing outstanding; loans summary = owed-to-user/user-owes/net-position/overdue-count, reusing each loan's own derived `computeLoanState` status rather than re-deriving due-date logic). New `GET /api/analytics/dashboard-summary?today=YYYY-MM-DD` (net worth + loans summary as of today, same `today`-as-client-local-date rationale as loans) and `GET /api/analytics/net-worth-trend?referenceMonth=YYYY-MM` (optional, defaults like the existing balance-trend endpoint) — kept as a separate trend from `balance-trend` since net worth folds in loan-event state at each month-end boundary while balance-trend stays a pure liquidity figure, per PLAN.md → Dashboard. Reused `financialPositionAccountStateSchema` (now exported from `report.dto.ts`) for the net-worth breakdown shape rather than redefining an identical schema.
- [x] Add historical accounting coverage in `packages/shared/src/{dtos/report.dto.test.ts,finance.test.ts}` and `packages/api/src/features/{reports/reports.test.ts,analytics/analytics.test.ts}`. `report.dto.test.ts` already had coverage from item 1; added `finance.test.ts` coverage for the three new functions above. `analytics.test.ts` (pre-existing, balance-trend only) extended with `dashboard-summary`/`net-worth-trend` route tests; `reports.test.ts` gained its first `/financial-position` route test (items 2-3 had only been verified live, not with a mocked test) proving reconciliation holds and loan principal stays out of income/expense end-to-end.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/shared exec tsc --noEmit && pnpm --filter @wallet/api typecheck`
- [x] `pnpm --filter @wallet/shared exec vitest run src/dtos/report.dto.test.ts src/finance.test.ts && pnpm --filter @wallet/api exec vitest run src/features/reports/reports.test.ts src/features/analytics/analytics.test.ts src/features/transactions/transactions.test.ts`

**Review checklist (user, at PR review):**
- [ ] Verify a mixed period reconciles account totals and net worth, including opening loans and write-off/forgiveness events.
- [ ] Confirm loan principal is absent from income, expenses, budgets, and savings metrics.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 3 — Web loan data layer

Branch: `personal-loans/phase-3-web-data` (off `personal-loans/phase-2-financial-position`, stacked)

Expose the completed loan and financial-position APIs through typed, invalidation-safe web queries before rendering new screens.

- [ ] Add `packages/web/src/features/loans/{db,queries}.ts` for People, loan, event, and action requests with user-scoped list/detail query keys.
- [ ] Extend `packages/web/src/features/{reports,dashboard}/{db,queries}.ts` for Financial Position and loan/net-worth summaries.
- [ ] Update loan mutation invalidation in `packages/web/src/features/loans/queries.ts` for loans, People aggregates, transactions, accounts, dashboard, and Financial Position reports.
- [ ] Add query behavior coverage in `packages/web/src/features/{loans/queries.test.tsx,reports/queries.test.tsx,dashboard/queries.test.tsx}`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web exec vitest run src/features/loans/queries.test.tsx src/features/reports/queries.test.tsx src/features/dashboard/queries.test.tsx`

**Review checklist (user, at PR review):**
- [ ] Perform a loan mutation and verify loans, account balances, transactions, dashboard, and Financial Position refresh together.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 4 — Responsive Loans UI

Branch: `personal-loans/phase-4-loans-ui` (off `personal-loans/phase-3-web-data`, stacked)

Deliver the dedicated person-first desktop and mobile Loans experiences using the established data layer.

- [ ] Add person-first list, filters, KPIs, and empty/loading/error states in `packages/web/src/features/loans/components/{DesktopLoans,MobileLoans,LoansPage}.tsx`.
- [ ] Add loan detail, event history, origin/repayment forms, opening-loan mode, confirmation actions, and desktop/mobile overlays in `packages/web/src/features/loans/components/`.
- [ ] Add Loans navigation/form/state/validation/confirmation translations in `packages/web/src/core/i18n.tsx`.
- [ ] Add focused UI coverage in `packages/web/src/features/loans/components/{LoansPage,LoanDetail,LoanForm,RepaymentForm}.test.tsx`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web exec vitest run src/features/loans/components/LoansPage.test.tsx src/features/loans/components/LoanDetail.test.tsx src/features/loans/components/LoanForm.test.tsx src/features/loans/components/RepaymentForm.test.tsx`

**Review checklist (user, at PR review):**
- [ ] On desktop and mobile, create a disbursed loan and an opening loan, then record partial and final repayments through different accounts.
- [ ] Verify due states, filters, closed-history visibility, and write-off/forgiveness/reopen confirmation copy.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 5 — App integration

Branch: `personal-loans/phase-5-app-integration` (off `personal-loans/phase-4-loans-ui`, stacked)

Connect Loans to routing, navigation, transaction history, dashboard, reports, and global loading without changing mobile primary navigation.

- [ ] Add `/loans` and `/loans/$loanId` in `packages/web/src/routing/{router,app-pages,app-route-state}.tsx` with stable transaction-to-loan deep links.
- [ ] Add desktop sidebar/command-palette and mobile Other-hub entries in `packages/web/src/layouts/{desktop/DesktopApp,mobile/MobileApp}.tsx` and `packages/web/src/routing/app-pages.tsx`.
- [ ] Render read-only loan rows/filter/deep links in `packages/web/src/features/transactions/components/{DesktopTransactionsTable,MobileTransactions,TransactionRow}.tsx` and transaction view state.
- [ ] Add net-worth/loan summary and historical trend integration in `packages/web/src/features/dashboard/components/{DesktopDashboard,MobileHome}.tsx`.
- [ ] Add Financial Position selection/rendering in `packages/web/src/features/reports/components/{ReportsPage,FinancialPositionReport}.tsx` and `report-types.ts`; include loan summaries in global app-data/pull-to-refresh paths.
- [ ] Add routing, navigation, transaction-row, dashboard, and Financial Position coverage in the corresponding `packages/web/src/{routing,layouts,features}/**/*.test.tsx` files.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web exec vitest run src/routing/router.test.ts src/layouts/mobile/MobileApp.test.tsx src/features/transactions/components/TransactionRow.test.tsx src/features/transactions/components/DesktopTransactionsTable.test.tsx src/features/reports/components/FinancialPositionReport.test.tsx src/features/dashboard/components/DesktopDashboard.test.tsx`

**Review checklist (user, at PR review):**
- [ ] Verify Loans is reachable from desktop, mobile Other, dashboard, and loan transaction rows while the mobile bottom nav remains unchanged.
- [ ] Verify English and Vietnamese copy across Loans, transaction rows, dashboard, and Financial Position reports.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.
