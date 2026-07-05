# Foundation — Plan

Backend correctness, date-handling, and the `store.tsx` architecture refactor. First of
three sibling specs carved from the "all Fixes + Features 7–13" backlog batch. Only this
spec is in flight; **Spec 2 (`feature-ux`)** and **Spec 3 (`polish`)** are grilled and
planned separately when this one completes.

## Scope

Resolves backlog **Fixes F1, F2, F3, F5, F6, F7, F8**. (F9 "selected category with
favorites" and F4 "month-scoping" are **not** here — see Decomposition below.)

| # | Fix | Decision |
|---|-----|----------|
| F2 | Subscription `/log` non-atomic | Postgres RPC `log_subscription` does insert-tx + update-`next_due_date` in one DB transaction. **TS computes `nextDueDate`** via the shared date util and passes it in; RPC is a thin atomic wrapper returning `{tx, subscription}`. Date logic stays unit-tested in TS. Feat11 (Spec 3) reuses this RPC. |
| F7 | `packages/api` dev script no watch | Make the dev script watch source (e.g. `tsx watch`) instead of build-once-run-`dist/`. |
| F3 | Timezone split (API UTC vs FE local) | `tx_date`/`nextDueDate` are **date-only strings** — treat as **tz-less calendar dates**. New `shared/lib/date.ts` (`parseLocalDate`, `todayLocalIso`, `isSameLocalMonth`, `diffDays`); replace every date-only `new Date(iso)` in `store.tsx`, `format.ts`, `subscriptions/helpers.ts`. No per-user tz setting, no migration. FE derives "current month" from local today. |
| F6 | Money math untested | Unit tests for `computeBalance`, `monthSummary`, subscription due-window. **Folded into the phase that touches each fn** (not a standalone phase); explicit checklist line per target. |
| F5 | `store.tsx` god-context | **Full migration**: relocate pure selectors (`computeBalance`, `monthSummary`, `spentForCategory`) to `shared`/feature libs; migrate all 51 `useStore()`/`l()` call sites to direct feature-query hooks; **delete the facade**; fix the 3 test files that mock `l()`. |
| F1 | Bulk delete N requests | Wire `useDeleteTransactions` (bulk `DELETE /api/transactions` + hook already exist, unused). The N-loop lives only in the facade's `deleteTransactions` (`store.tsx:139`) and dies with F5; consumers call the bulk hook directly. |
| F8 | CLAUDE.md stale | Re-baseline CLAUDE.md architecture/commands to reflect the post-refactor state (facade removed, date utils, RPC). Same PR as F5 (which makes it stale). Note: partly refreshed already in `2fa4008`, but F5 re-invalidates the `store.tsx` description. |

## Key architectural decision — balance stays client-side (this spec)

F4 (month-scope transaction queries) breaks client-side `computeBalance`, which sums the
**entire** transactions array (`store.tsx:331`, consumed by `AccountList`,
`DesktopAccounts`). Resolving that requires **server-computed balance**. But server-balance
has **no consumer** until scoping is switched on, and switching scoping on without a month
switcher is a "can't-see-history" regression.

**Decision:** the entire balance/scoping cluster — F4 scoping + server-balance endpoint +
shared reducer consumed server-side + month switcher + Feat8 filters — moves to **Spec 2
(`feature-ux`)**, where the pieces are mutually dependent. Spec 1 keeps **fetch-all + client
`computeBalance`**, relocated to `shared` during F5 and unit-tested by F6.

Recorded downstream decisions (for Spec 2's grill, already settled here): balance is
**server-computed** (accounts route returns a `balance` field), via a **shared TS reducer**
called in the route (no SQL view; keeps math in tested TS).

## Decomposition (batch context, not this spec's work)

- **Spec 1 `foundation`** (this): F1, F2, F3, F5, F6, F7, F8.
- **Spec 2 `feature-ux`**: F4 + server-balance cluster, F9, Feat7 (analytics — incl. wiring
  the dashboard trend chart off static `monthlyTrend` seed), Feat8 (filters/month switcher),
  Feat9 (category select UI), Feat10 (category icon mapping).
- **Spec 3 `polish`**: Feat11 (subscription confirm-payment — reuses F2's RPC), Feat12
  (loading states for non-form actions), Feat13 (desktop shortcuts + command palette).
- **Spec 4 `api-restructure`**: behavior-preserving migration of `packages/api` to a layered
  feature architecture (controller/service/repository/schema per domain). Runs last so it
  restructures routes in their final shape.

One spec in flight at a time; Specs 2–4 are grilled/planned separately (all four PLANs now
exist; EXECUTION.md is generated per spec at activation).

## Phases

1. **Backend atomicity + tooling** (F2, F7) — backend/tooling only, no FE dependency.
2. **Date policy** (F3 + F6 date-dependent tests) — shared date utils + call-site replacement.
3. **Store refactor + bulk delete + docs** (F5, F1, F6 `computeBalance` test, F8) — the heavy
   mechanical phase; 51-site migration, facade deleted, bulk delete wired, docs re-baselined.

## Affected files

- API: `packages/api/src/routes/subscriptions.ts`, `.../transactions.ts` (F1 already has the
  endpoint), `packages/api/package.json` (dev script), `supabase/migrations/` (new RPC).
- Shared: new `packages/web/src/shared/lib/date.ts`; relocated selectors landing in
  `shared`/feature libs.
- Web: `core/store.tsx` (deleted/gutted), `shared/lib/format.ts`,
  `features/subscriptions/helpers.ts`, and all ~25 `useStore()`/`l()` consumer files;
  `TransactionForm.test.tsx`, `CategoriesPage.test.tsx`, `TransactionRow.test.tsx` (l() mocks).
- Docs: `CLAUDE.md`.

## Constraints

- Integration branch `develop`; stacked phase branches (default).
- Frontend code via `react-frontend-developer`; `terse-commit` before commits.
- Money math must remain in tested TypeScript (drove the F2 and balance mechanism choices).
- i18n parity if any user-facing string is added (none anticipated in this spec).

## Non-goals

- No month-scoping of transaction queries, no server-balance endpoint, no month switcher
  (all Spec 2).
- No per-user timezone preference (over-engineering; belongs in the "Small UX batch" backlog
  item if ever needed).
- No analytics, filters, or category-UI work (Specs 2/3).

## Open items

None — all resolved in grilling.
