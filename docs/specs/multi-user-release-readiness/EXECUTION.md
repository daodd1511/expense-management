# Multi-User Release Readiness — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — in-progress
- Phase 1 — Automated readiness: in-progress
- Verification debt: none

## Phase 1 — Automated readiness

Branch: `multi-user-release-readiness/phase-1-automated-readiness` (off `develop`)

This phase makes zero-Account onboarding safe and proves existing API ownership boundaries before the production walkthrough.

- [x] Add localized zero-Account copy in `packages/web/src/core/i18n.tsx` and a reusable first-Account CTA in `packages/web/src/features/accounts/components/FirstAccountState.tsx` that navigates to `/accounts` with create intent.
- [ ] Render `FirstAccountState` from `packages/web/src/features/dashboard/components/DesktopDashboard.tsx` and `MobileHome.tsx` when `useAccounts()` resolves empty; cover both in `DesktopDashboard.test.tsx` and new `MobileHome.test.tsx`.
- [ ] Redirect zero-Account `openCreate` calls to Account creation in `packages/web/src/features/transactions/transaction-overlay.tsx`, covering desktop button, mobile FAB, command palette, and keyboard shortcut centrally; add `transaction-overlay.test.tsx`.
- [ ] Make `packages/web/src/features/transactions/components/TransactionForm.tsx` initialize and validate empty Account selections safely; extend `TransactionForm.test.tsx` with zero-Account rendering and submission regressions.
- [ ] Extend `packages/api/src/features/accounts/accounts.test.ts` and `transactions/transactions.test.ts` with authenticated-user isolation cases proving another User's rows are excluded from reads and cannot be updated or deleted.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/api typecheck`
- [ ] `pnpm --filter @wallet/api test -- src/features/accounts/accounts.test.ts src/features/transactions/transactions.test.ts`
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test -- src/features/dashboard/components/DesktopDashboard.test.tsx src/features/dashboard/components/MobileHome.test.tsx src/features/transactions/components/TransactionForm.test.tsx src/features/transactions/transaction-overlay.test.tsx`

**Review checklist (user, at PR review):**
- [ ] In two separate browser profiles, sign up as different Users, create an Account and Transaction for each, then sign out/in and confirm each User sees only their own data.
- [ ] Confirm the existing owner's data remains visible and unchanged.
- [ ] Confirm a brand-new User sees the first-Account CTA and every Add Transaction action redirects safely until an Account exists.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
