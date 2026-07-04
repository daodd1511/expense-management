# Mobile UX Improvements — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default) — each phase branches off
the previous phase's branch without waiting for its PR to merge; phase 1 branches off
`develop`. Rebase a stacked phase's branch onto `develop` once an earlier phase in the
chain merges. Frontend code via `react-frontend-developer`; `terse-commit` before commits.

## STATUS

- Current phase: none started
- Phase 1 — Transaction form fixes: `pending`
- Phase 2 — Transaction list parent: `pending`
- Phase 3 — Categories redesign: `pending`
- Phase 4 — Optimistic transaction updates: `pending`
- Phase 5 — Pull-to-refresh: `pending`
- Verification debt: none

---

## Phase 1 — Transaction form fixes (#1, #2, #3, #5)

Branch: `mobile-ux/phase-1-form-fixes` (off `develop` — phase 1 always bases on the
integration branch)

Pure frontend. Fixes the four form-level issues that all live in the add-transaction flow.

- [ ] **#1 Autofocus** — add a ref to the amount `<input>` in `TransactionForm.tsx` and
      focus it on mount (`useEffect` + `ref.current?.focus()`), both variants.
- [ ] **#5 Inline amount format** — reformat the amount input value with thousands
      separators on each change: strip non-digits → keep numeric string in state → display
      grouped (reuse the grouping used by `formatVND` in `shared/lib/format.ts`, digits only,
      no `₫`). Remove the separate `formatVND` `<span>` below the input (`TransactionForm.tsx`
      ~L158–160). Caret parks at end. Keep the 12-digit cap.
- [ ] **#2 Date off-by-one** — in `shared/components/ui/date-picker.tsx`, replace
      `date.toISOString().slice(0,10)` in `handleSelect` with local Y/M/D formatting (same
      shape as `todayIsoDate()` in `TransactionForm.tsx`). Audit `new Date(value)` for
      `selected`/`maxDate` — if the displayed date drifts, parse as local too.
- [ ] **#3 Zoom-on-focus** — add `, maximum-scale=1` to the `viewport` meta in
      `packages/web/index.html`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (incl. `TransactionForm.test.tsx`)

**Review checklist (user, at PR review):**
- [ ] On a mobile viewport (or real device), open Add Transaction — amount is focused and
      keyboard is up.
- [ ] Type `1000000` — input shows `1.000.000` inline, no duplicate formatted line below.
- [ ] Open the date picker, tap the 1st — the field shows the 1st (not the 30th).
- [ ] Focus merchant/note — no auto-zoom.
- [ ] The bottom-sheet mount animation isn't fought by the amount autofocus.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 2 — Transaction list parent category (#4)

Branch: `mobile-ux/phase-2-list-parent` (off `mobile-ux/phase-1-form-fixes`, stacked)

- [ ] In `TransactionRow.tsx`, when `cat.parentId` is set, resolve the parent via
      `getCategory(cat.parentId)` and render the subtitle as `Parent › Child · Account`;
      top-level (no `parentId`) stays `Child · Account`. Transfer subtitle unchanged.
      Keep the existing `truncate` so long breadcrumbs clip gracefully.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`

**Review checklist (user, at PR review):**
- [ ] A transaction on a nested category (e.g. Food › Dating) shows both levels.
- [ ] A top-level-category transaction shows only its own name.
- [ ] A transfer row is unchanged.
- [ ] Long names truncate without breaking the row layout.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 3 — Categories redesign, Direction A (#6)

Branch: `mobile-ux/phase-3-categories` (off `mobile-ux/phase-2-list-parent`, stacked)

Restyle `CategoriesPage.tsx` (serves both mobile + desktop). No data/API changes.

- [ ] Add a type segmented control (Chi tiêu / Thu nhập) at the top of the page; filter the
      grouped list to the active type. Reuse `dashboard.expense`/`dashboard.income` i18n keys
      if suitable; otherwise add new keys to **both** `VI` and `EN` in `core/i18n.tsx`.
- [ ] Replace `CategoryGroupBox`'s bordered box with a quiet section header (parent icon +
      name, no `border`), children rendered as **full-width rows** (icon · name · trailing
      star toggle), whole row is the edit target.
- [ ] Move the favorite `Star` from the overlapping corner badge to a trailing,
      always-visible toggle within each row (`FavoriteToggle`, repositioned — drop the
      `absolute -right-1 -top-1` placement).
- [ ] Keep system-category rows non-editable (existing `isSystem` disabled behavior) and the
      parent-level favorite toggle.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (incl. `CategoriesPage.test.tsx` — update assertions
      if the structure they query changed)

**Review checklist (user, at PR review):**
- [ ] Segmented control switches expense/income sets.
- [ ] No bordered boxes remain; star is a visible trailing toggle that toggles favorite and
      does not overlap.
- [ ] Tapping a non-system row opens the edit sheet/drawer; system rows stay disabled.
- [ ] Layout is clean on both mobile and desktop widths (row layout replaces the old
      4/5/6-col child grid on both).

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 4 — Optimistic transaction updates (#7)

Branch: `mobile-ux/phase-4-optimistic` (off `mobile-ux/phase-3-categories`, stacked)

In `features/transactions/queries.ts`, convert the three mutation hooks to optimistic.

- [ ] `useAddTransaction`: `onMutate` → `cancelQueries(['transactions', user?.id])`,
      snapshot previous, insert a temp-id optimistic row into the cache; `onError` → restore
      snapshot; `onSettled` → `invalidateQueries`.
- [ ] `useUpdateTransaction`: same pattern, patch the matching row in the cached array.
- [ ] `useDeleteTransaction`: same pattern, remove the row from the cached array.
- [ ] Remove the optimistic-updates line from `docs/BACKLOG.md` (Ideas section).

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`

**Review checklist (user, at PR review):**
- [ ] Add a transaction — it appears in the list instantly before the request resolves.
- [ ] Edit one — change shows immediately. Delete one — row disappears immediately.
- [ ] Force an error (e.g. offline) — the optimistic change rolls back and an error surfaces.
- [ ] Computed account balance is correct after settle (no stale value from an aborted
      optimistic update).

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

---

## Phase 5 — Pull-to-refresh (#8)

Branch: `mobile-ux/phase-5-pull-to-refresh` (off `mobile-ux/phase-4-optimistic`, stacked)

- [ ] Add a custom touch-based hook under `packages/web/src/shared/hooks/` (e.g.
      `usePullToRefresh`) — no new dependency. Tracks touch drag at scrollTop 0, exposes a
      pull offset + a triggered callback; parametrized by an `onRefresh` async fn.
- [ ] Wire it into the mobile **Home** screen and **Transactions**
      (`MobileTransactions.tsx` / the relevant `MobileApp.tsx` screen) so it invalidates that
      screen's queries via `queryClient.invalidateQueries`.
- [ ] Provide a minimal pull indicator (spinner/arrow) consistent with existing motion tokens
      (`--duration-*`, `--ease-*`). Desktop unaffected.
- [ ] Remove pull-to-refresh from the "Small UX batch" line in `docs/BACKLOG.md` (leave the
      rest of that line's items).

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`

**Review checklist (user, at PR review):**
- [ ] Mobile viewport/device: at the top of Home, drag down → indicator appears → release →
      queries refetch. Same on Transactions.
- [ ] A normal mid-list scroll does not trigger a refresh.
- [ ] Desktop is unchanged.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
