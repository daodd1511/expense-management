# Mobile UX Improvements — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

**Branch model:** sequential, no stacking. Each phase branches off `develop`, PRs to
`develop`, is reviewed + merged, then the next phase branches off the updated `develop`.
Do not start a phase's push/PR without explicit confirmation even when its commits are
authorized. Frontend code via `react-frontend-developer`; `terse-commit` before commits.

## STATUS

- Current phase: **none started**
- Phase 1 — Transaction form fixes: `pending`
- Phase 2 — Transaction list parent: `pending`
- Phase 3 — Categories redesign: `pending`
- Phase 4 — Optimistic transaction updates: `pending`
- Phase 5 — Pull-to-refresh: `pending`
- Verification debt: none

---

## Phase 1 — Transaction form fixes (#1, #2, #3, #5)

Branch: `mobile-ux/phase-1-form-fixes` (off `develop`)

Pure frontend. Fixes the four form-level issues that all live in the add-transaction flow.

- [ ] **#1 Autofocus** — add a ref to the amount `<input>` in `TransactionForm.tsx` and
      focus it on mount (`useEffect` + `ref.current?.focus()`), both variants. Verify it
      does not fight the bottom-sheet mount animation.
- [ ] **#5 Inline amount format** — reformat the amount input value with thousands
      separators on each change: strip non-digits → keep numeric string in state → display
      grouped (reuse the grouping used by `formatVND` in `shared/lib/format.ts`, digits only,
      no `₫`). Remove the separate `formatVND` `<span>` below the input (`TransactionForm.tsx`
      ~L158–160). Caret parks at end. Keep the 12-digit cap.
- [ ] **#2 Date off-by-one** — in `shared/components/ui/date-picker.tsx`, replace
      `date.toISOString().slice(0,10)` in `handleSelect` with local Y/M/D formatting (same
      shape as `todayIsoDate()` in `TransactionForm.tsx`). Audit `new Date(value)` for
      `selected`/`maxDate` — if the displayed date drifts, parse as local too. Confirm
      round-trip: pick 1st → stored value is the 1st.
- [ ] **#3 Zoom-on-focus** — add `, maximum-scale=1` to the `viewport` meta in
      `packages/web/index.html`.

### Verification gate (hard)

- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (incl. `TransactionForm.test.tsx`)
- [ ] Manual: on a mobile viewport (or real device) — (a) open Add Transaction, amount is
      focused and keyboard is up; (b) type `1000000`, input shows `1.000.000` inline and no
      duplicate formatted line appears below; (c) open the date picker, tap the 1st, the
      field shows the 1st (not the 30th); (d) focus merchant/note — no auto-zoom.

### On completion

- Update this checklist + STATUS block.
- Update root `HANDOFF.md`.
- Stop and ask before push/PR.

---

## Phase 2 — Transaction list parent category (#4)

Branch: `mobile-ux/phase-2-list-parent` (off `develop`)

- [ ] In `TransactionRow.tsx`, when `cat.parentId` is set, resolve the parent via
      `getCategory(cat.parentId)` and render the subtitle as `Parent › Child · Account`;
      top-level (no `parentId`) stays `Child · Account`. Transfer subtitle unchanged.
      Keep the existing `truncate` so long breadcrumbs clip gracefully.

### Verification gate (hard)

- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] Manual: a transaction on a nested category (e.g. Food › Dating) shows both levels;
      a top-level-category transaction shows only its own name; a transfer row is unchanged;
      long names truncate without breaking the row layout.

### On completion

- Update this checklist + STATUS block.
- Update root `HANDOFF.md`.
- Stop and ask before push/PR.

---

## Phase 3 — Categories redesign, Direction A (#6)

Branch: `mobile-ux/phase-3-categories` (off `develop`)

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
- [ ] Verify the layout holds on both breakpoints (mobile single column; desktop wider) —
      the row layout replaces the 4/5/6-col child grid on both.

### Verification gate (hard)

- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (incl. `CategoriesPage.test.tsx` — update assertions
      if the structure they query changed)
- [ ] Manual: segmented control switches expense/income sets; no bordered boxes; star is a
      visible trailing toggle that toggles favorite and does not overlap; tapping a
      non-system row opens the edit sheet/drawer; system rows stay disabled; layout is clean
      on both mobile and desktop widths.

### On completion

- Update this checklist + STATUS block.
- Update root `HANDOFF.md`.
- Stop and ask before push/PR.

---

## Phase 4 — Optimistic transaction updates (#7)

Branch: `mobile-ux/phase-4-optimistic` (off `develop`)

In `features/transactions/queries.ts`, convert the three mutation hooks to optimistic.

- [ ] `useAddTransaction`: `onMutate` → `cancelQueries(['transactions', user?.id])`,
      snapshot previous, insert a temp-id optimistic row into the cache; `onError` → restore
      snapshot; `onSettled` → `invalidateQueries`.
- [ ] `useUpdateTransaction`: same pattern, patch the matching row in the cached array.
- [ ] `useDeleteTransaction`: same pattern, remove the row from the cached array.
- [ ] Ensure balance/dashboard derived views reconcile on `onSettled` invalidation (they
      read from the same query — confirm no stale computed balance persists).
- [ ] Remove the optimistic-updates line from `docs/BACKLOG.md` (Ideas section).

### Verification gate (hard)

- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] Manual: add a transaction — it appears in the list instantly before the request
      resolves; edit one — change shows immediately; delete one — row disappears immediately;
      force an error (e.g. offline) — the optimistic change rolls back and an error surfaces;
      computed account balance is correct after settle.

### On completion

- Update this checklist + STATUS block.
- Update root `HANDOFF.md`.
- Stop and ask before push/PR.

---

## Phase 5 — Pull-to-refresh (#8)

Branch: `mobile-ux/phase-5-pull-to-refresh` (off `develop`)

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

### Verification gate (hard)

- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] Manual (mobile viewport/device): at the top of Home, drag down → indicator appears →
      release → queries refetch; same on Transactions; a normal mid-list scroll does not
      trigger a refresh; desktop is unchanged.

### On completion

- Update this checklist + STATUS block.
- Update root `HANDOFF.md`.
- Stop and ask before push/PR.
