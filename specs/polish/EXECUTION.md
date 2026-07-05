# Polish — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 2 — in-progress
- Phase 1 — Subscription confirm-payment: done
- Phase 2 — Loading states: in-progress
- Phase 3 — Shortcuts + command palette: pending
- Verification debt:
  - Partial Phase 2 edits were started on `polish/phase-1-subscription-confirm-payment` before the phase checkpoint/branch split; no Phase 2 branch exists yet.
  - Agent gate has not been rerun after the interrupted Phase 2 edits.
  - [packages/web/src/features/accounts/components/DesktopAccounts.tsx](/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app/packages/web/src/features/accounts/components/DesktopAccounts.tsx) is currently syntactically broken from an interrupted patch and must be repaired before any gate run.

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

Branch: `polish/phase-2-loading-states` (off `polish/phase-1-subscription-confirm-payment`, stacked)

This phase depends on the subscription confirm flow because its loading treatment becomes
the pattern for the remaining list and delete-confirm surfaces.

- [ ] Add reusable skeleton UI in `packages/web/src/shared/components/` for primary data-screen initial loads using the existing design tokens.
- [ ] Wire initial-load skeleton states from feature queries into `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx`, `MobileTransactions.tsx`, `packages/web/src/features/dashboard/components/DesktopDashboard.tsx`, `MobileHome.tsx`, `packages/web/src/features/accounts/components/DesktopAccounts.tsx`, `MobileAccounts.tsx`, `packages/web/src/features/subscriptions/components/DesktopSubscriptions.tsx`, `MobileSubscriptions.tsx`, `packages/web/src/features/categories/components/CategoriesPage.tsx`, and the budgets screen components.
- [ ] Ensure the relevant feature query hooks expose and consume `isPending` in their `queries.ts` files without regressing existing empty-state behavior.
- [ ] Add disabled + spinner confirm-button behavior to delete confirmations in `packages/web/src/features/categories/components/CategoryForm.tsx`, `packages/web/src/features/subscriptions/components/DesktopSubscriptions.tsx`, `MobileSubscriptions.tsx`, `packages/web/src/features/accounts/components/DesktopAccounts.tsx`, `MobileAccounts.tsx`, `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx`, and `TransactionRow.tsx`.
- [ ] Add or update targeted tests for skeleton rendering and delete-confirm loading behavior.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] `pnpm --filter @wallet/web build`

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
