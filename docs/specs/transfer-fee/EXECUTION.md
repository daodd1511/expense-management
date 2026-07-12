# Transfer Fee — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — in-progress
- Phase 1 — Persistence and transaction API: in-progress
- Phase 2 — Transfer form: pending
- Verification debt: none

Mode: goal.

## Phase 1 — Persistence and transaction API

Branch: `transfer-fee/phase-1-persistence-api` (off `develop`, stacked)

Persist the linked expense and make the API create, synchronize, and report it before a client can submit a fee.

- [ ] Add `linkedTransferId` row/model mapping and create/patch `fee` validation in `packages/shared/src/models/transaction.model.ts`, `packages/shared/src/dtos/transaction.dto.ts`, `packages/shared/src/mappers/transaction.mapper.ts`, and `packages/shared/src/dtos/transaction.dto.test.ts`.
- [x] (amended 2026-07-12) Update `AGENTS.md` to pre-authorize commits only during user-authorized `spec-phase` runs.
- [ ] Add `supabase/migrations/<timestamp>_transfer_fee.sql` with `transactions.linked_transfer_id` FK `ON DELETE CASCADE` and the hidden expense `Transfer Fee` system category; rely on this DB cascade rather than an API-side cascade delete.
- [ ] Implement transfer-fee create/update synchronization in `packages/api/src/features/transactions/service.ts` and `packages/api/src/features/transactions/repository.ts`, including fee removal when zero/blank, with coverage in `packages/api/src/features/transactions/transactions.test.ts`.
- [ ] Change `packages/api/src/features/reports/service.ts` and `packages/api/src/features/reports/reports.test.ts` to exclude Balance Adjustment, but include hidden Transfer Fee, in expense totals and category aggregates.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/shared exec tsc --noEmit && pnpm --filter @wallet/api typecheck`
- [ ] `pnpm --filter @wallet/shared exec vitest run src/dtos/transaction.dto.test.ts && pnpm --filter @wallet/api test -- src/features/transactions/transactions.test.ts src/features/reports/reports.test.ts`

**Review checklist (user, at PR review):**
- [ ] Create a transfer with a fee and confirm source debits `amount + fee`, destination receives `amount`, reports include the fee, and deleting the transfer reverses both rows.
- [ ] Create and edit a no-fee transfer; confirm no fee row is created and setting/removing a fee creates/removes only the linked expense.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — Transfer form

Branch: `transfer-fee/phase-2-transfer-form` (off `transfer-fee/phase-1-persistence-api`, stacked)

Expose the already-supported fee payload only in the transfer form.

- [ ] Add a transfer-only Fee `AmountField` and submit its optional positive value from `packages/web/src/features/transactions/components/TransactionForm.tsx`; use the existing hidden-category filter unchanged.
- [ ] Add `form.fee` translations in `packages/web/src/core/i18n.tsx` and transfer-fee create/edit assertions in `packages/web/src/features/transactions/components/TransactionForm.test.tsx`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test -- src/features/transactions/components/TransactionForm.test.tsx`

**Review checklist (user, at PR review):**
- [ ] Verify Fee appears only for transfers, blank/zero preserves a normal transfer, and Transfer Fee is absent from manual category pickers while present in the report breakdown.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR. Review checklist goes into the PR description.
