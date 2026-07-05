# Polish — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 2 — done
- Phase 1 — Subscription confirm-payment: done
- Phase 2 — Loading states: done
- Phase 3 — Shortcuts + command palette: pending
- Verification debt: none. Phases 1 and 2 landed in one commit (`9b0784e`) on
  `polish/phase-1-subscription-confirm-payment` rather than on separate stacked branches —
  a prior session's Phase 2 edits were started directly on the Phase 1 branch and were
  interrupted mid-patch (`DesktopAccounts.tsx` left syntactically broken, no Phase 2 branch
  ever created). Repaired the syntax break, added the one missing test the checklist asked
  for (`Skeleton.test.tsx`), and committed both phases together since their diffs were
  already interleaved in the same files. Phase 3 will branch off this branch/commit as
  `polish/phase-3-command-palette`, per the stacked model.

## Phase 1 — Subscription confirm-payment

Branch: `polish/phase-1-subscription-confirm-payment` (off `develop`, stacked)

This phase isolates the subscription logging UX change so the confirm flow can land before
the broader loading-state and keyboard work builds on it.

- [x] Add a reusable subscription payment confirmation surface in `packages/web/src/features/subscriptions/components/` that previews amount, account, category, and date for the transaction created by the existing log flow.
- [x] Replace raw log actions in `packages/web/src/features/subscriptions/components/SubscriptionDueBanner.tsx`, `MobileSubscriptions.tsx`, and `DesktopSubscriptions.tsx` with the new confirmation surface.
- [x] Keep the mutation path on `packages/web/src/features/subscriptions/queries.ts` using the existing `log_subscription` RPC and expose the pending state needed by the confirm action.
- [x] Add i18n copy for the confirm-payment flow in `packages/web/src/core/i18n.tsx` with vi/en parity.
- [x] Add or update targeted tests covering the confirm flow and loading state in the relevant subscription component tests.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] On desktop, clicking a due-banner or subscription-list log action opens a confirmation dialog showing amount, account, category, and date before any transaction is created.
- [ ] On mobile, confirming a due subscription requires the same preview step and the confirm action shows a loading state while the mutation is in flight.
- [ ] Confirming a subscription payment creates exactly one transaction and advances the next due date using the existing server-backed behavior.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Loading states

Branch: `polish/phase-1-subscription-confirm-payment` (landed here, not on a separate
`polish/phase-2-loading-states` branch — see STATUS for why)

This phase depends on the subscription confirm flow because its loading treatment becomes
the pattern for the remaining list and delete-confirm surfaces.

- [x] Add reusable skeleton UI in `packages/web/src/shared/components/Skeleton.tsx` for
      primary data-screen initial loads using the existing design tokens (one per screen:
      dashboard, accounts, budgets, transactions, subscriptions, categories; each mobile +
      desktop variant).
- [x] Wire initial-load skeleton states from feature queries' `isPending` into
      `DesktopTransactionsTable.tsx`, `MobileTransactions.tsx`, `DesktopDashboard.tsx`,
      `MobileHome.tsx`, `DesktopAccounts.tsx`, `MobileAccounts.tsx`,
      `DesktopSubscriptions.tsx`, `MobileSubscriptions.tsx`, `CategoriesPage.tsx`,
      `DesktopBudgets.tsx`, `MobileBudgets.tsx`.
- [x] `isPending` comes directly off each `useQuery`-backed hook (`useAccounts`,
      `useTransactions`, etc.) — no `queries.ts` changes needed, it's inherent to
      TanStack Query's return shape.
- [x] Delete-confirm loading: `CategoryForm.tsx`'s delete action now tracks its own
      pending/error state (previously discarded `isSubmitting` from `useFormSubmit`, so its
      delete confirm had no loading feedback). Every other delete confirmation
      (`DesktopSubscriptions`/`MobileSubscriptions`, `DesktopAccounts`/`MobileAccounts`,
      `DesktopTransactionsTable`, `TransactionRow`) already renders through the shared
      `ConfirmDialog`, which manages its own `isConfirming` state internally — no
      per-screen wiring was needed there, `TransactionRow.tsx` included.
- [x] Tests: `Skeleton.test.tsx` (all 6 skeleton screens, mobile + desktop variants);
      delete-confirm loading covered by the existing `confirm-dialog.test.tsx`
      ("shows a loading label and disables controls while confirm is pending").

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` — pass
- [x] `pnpm --filter @wallet/web test` — 26 files / 122 tests pass
- [x] `pnpm --filter @wallet/web build` — pass

**Review checklist (user, at PR review):**
- [ ] Each primary desktop and mobile data screen shows a skeleton on first load instead of flashing empty content.
- [ ] Delete confirmations disable the confirm action and show progress text/icon until the mutation settles.
- [ ] Existing empty states still appear only after a completed load with no data.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Shortcuts + command palette

Branch: `polish/phase-3-command-palette` (off `polish/phase-2-loading-states`, stacked)

This phase sits last because it composes existing desktop navigation and creation flows
without blocking the earlier UX fixes.

- [ ] Add desktop keyboard-shortcut handling in `packages/web/src/shared/hooks/useKeyboardShortcuts.ts` that ignores focused inputs and textareas.
- [ ] Build a filterable command palette on the existing dialog primitives in `packages/web/src/shared/components/` with entries for screen navigation and new-entity actions.
- [ ] Mount the desktop-only palette and shortcut wiring in `packages/web/src/layouts/desktop/DesktopApp.tsx`.
- [ ] Connect palette actions to the existing navigation and create flows used by Dashboard, Transactions, Accounts, Budgets, Subscriptions, Categories, and Settings, plus the new transaction/account/budget/subscription entry points.
- [ ] Add i18n labels and targeted tests for shortcut guarding, palette open/filter behavior, and action dispatch.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**
- [ ] `Cmd/Ctrl+K` opens the palette on desktop and filters actions as text is entered.
- [ ] `N` opens the new-transaction flow and `/` focuses search when the user is not typing into an input.
- [ ] Desktop palette actions navigate to each listed screen and launch the listed creation flows.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
