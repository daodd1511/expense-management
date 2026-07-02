# Category UX — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

**Base branch note:** Phase 1 bases off `category-redesign/phase-3-fe-ui`, not `main`. This
spec's own-page work directly depends on `Settings.tsx`'s boxed-group redesign,
`CategoryForm`, and `groupCategories()` — all built in `category-redesign` and not yet on
`main` (that spec's branches aren't merged). If `category-redesign` merges to `main` before
this spec starts, rebase Phase 1 onto `main` instead and drop this note.

All phases after Phase 1 stack sequentially on each other (`phase-2` off `phase-1`, etc.),
per the normal rule. Do not start a phase's PR/push without explicit confirmation even if
the phase's commits are already authorized.

---

## Phase 1 — Categories Own Page

Branch: `category-ux/phase-1-categories-page` (off `category-redesign/phase-3-fe-ui`)

Pure frontend restructuring — no schema or API changes.

- [x] Add `'categories'` to the `Screen` union in
      `packages/web/src/layouts/mobile/MobileApp.tsx` — not added to `NAV`. Added
      `TITLES.categories` (reuses existing `settings.categories` i18n key, no new key
      needed)
- [x] Add `'categories'` to the `Tab` union in
      `packages/web/src/layouts/desktop/DesktopApp.tsx` — not added to `NAV`
- [x] New `packages/web/src/features/categories/components/CategoriesPage.tsx`
      (variant-aware): moved the grouped-box list (`CategoryGroupBox`), "Add" button, and
      `CategoryForm` Drawer/BottomSheet out of `Settings.tsx` wholesale. Height clamp
      removed. In-content "← Back" button at the top (reuses `settings.title` as its
      label)
- [x] `packages/web/src/features/settings/components/Settings.tsx`: category `Card`
      section replaced with a single summary link row ("Categories · {n} ›") calling
      `onNavigateToCategories`. Also dropped the now-unused `variant` prop from
      `DesktopSettings` entirely (no BottomSheet/Drawer decision left to make there)
- [x] Wired navigation in `MobileApp.tsx` / `DesktopApp.tsx`

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [x] FE test suite passes (17/17: `CategoryPicker.test.tsx`, `BudgetForm.test.ts`,
      `TransactionForm.test.tsx` unaffected, as expected)
- [ ] Manual check: Settings → tap "Categories" row → lands on the new page showing the
      full grouped list → tap "← Back" → returns to Settings, on both mobile and desktop —
      **not run**, no browser automation tool available this session, same known gap as
      `category-redesign` phases 2/3. Dev server smoke-checked instead
      (`pnpm --filter @wallet/web dev`, `/` → 200).

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR — per this session's `/goal`, push is pre-authorized without re-asking each phase;
PR-creation is still not authorized (also blocked anyway: `gh` account mismatch, see
`HANDOFF.md`).

---

## Phase 2 — Favorites Schema, Shared Types, API

Branch: `category-ux/phase-2-favorites-schema-api` (off `phase-1`)

- [ ] New Supabase migration: `category_favorites` table exactly per `PLAN.md`'s "Schema
      Changes" section (`id uuid pk default gen_random_uuid()`, `user_id uuid not null
      references auth.users(id)`, `category_id uuid not null references categories(id) on
      delete cascade`, `created_at timestamptz not null default now()`, unique
      `(user_id, category_id)`). Write the migration file only — do **not** apply it
      without a separate explicit confirmation, same as `category-redesign` Phase 1
- [ ] `packages/shared/src/models/favorite.model.ts`: domain model `{ categoryId: string }`
- [ ] `packages/shared/src/dtos/favorite.dto.ts`: row schema (`id`, `user_id`,
      `category_id`, `created_at`) + create schema (`{ categoryId: string }` in the
      request body)
- [ ] `packages/shared/src/mappers/favorite.mapper.ts`: row ↔ domain mapping
- [ ] Export the new model/dto/mapper from `packages/shared/src/models/index.ts` and
      wherever DTOs/mappers are re-exported (check `packages/shared/src/index.ts` for the
      existing pattern)
- [ ] New `packages/api/src/routes/favorites.ts`, mounted at `/favorites`, mirroring
      `budgets.ts`'s owner-scoped resource pattern:
  - [ ] `GET /favorites` — list current user's favorite category ids
  - [ ] `POST /favorites` — body `{ categoryId }`; idempotent (`ON CONFLICT DO NOTHING` at
        the DB level, or an app-layer existence check — PLAN.md leaves the exact mechanism
        open, pick one and note the choice in the PR, it doesn't change behavior)
  - [ ] `DELETE /favorites/:categoryId` — remove the row; `404` if not favorited
- [ ] Mount `favoritesRouter` alongside the other routers (find where `categoriesRouter` /
      `budgetsRouter` are mounted in `packages/api/src/index.ts` or equivalent)
- [ ] Add backend tests: `packages/api/src/routes/favorites.test.ts` covering list, add,
      idempotent duplicate add, remove, and 404-on-remove-of-a-non-favorited-category —
      follow `categories.test.ts`'s Supabase-stub pattern

**Verification gate (hard):**
- [ ] `tsc --noEmit -p packages/shared/tsconfig.json` passes
- [ ] `tsc --noEmit -p packages/api/tsconfig.json` passes
- [ ] Backend test suite passes (direct vitest run, per the known `pnpm` sandbox caveat —
      see root `HANDOFF.md`)
- [ ] Manual verify against the live linked DB once the migration is applied: add a
      favorite, list favorites, duplicate `POST` is idempotent (no error, no duplicate
      row), `DELETE` removes it, `DELETE` on an already-unfavorited category returns `404`

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 3 — Favorites FE Data Layer

Branch: `category-ux/phase-3-favorites-fe-data` (off `phase-2`)

- [ ] `packages/web/src/features/categories/favorites-db.ts`: `fetchFavorites`,
      `addFavorite`, `removeFavorite` API client functions, mirroring
      `packages/web/src/features/categories/db.ts`'s shape
- [ ] `packages/web/src/features/categories/favorites-queries.ts`: `useFavorites()`,
      `useAddFavorite()`, `useRemoveFavorite()` TanStack Query hooks, mirroring
      `queries.ts`
- [ ] `packages/web/src/core/store.tsx`: wire `favoriteCategoryIds: Set<string>` (derived
      from `useFavorites()`), plus `addFavorite`/`removeFavorite` callbacks, exposed via
      `useStore()`. Update the `StoreContext` type accordingly

**Verification gate (hard):**
- [ ] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [ ] FE test suite passes
- [ ] Manual check: not applicable yet — no UI consumes this layer until Phase 4, skip

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 4 — Favorites UI (Management Toggle + Transaction Picker)

Branch: `category-ux/phase-4-favorites-ui` (off `phase-3`)

- [ ] `CategoriesPage.tsx` (from Phase 1): add a star toggle per category row/tile (both
      the parent box header and each child tile), calling `addFavorite`/`removeFavorite`
      from `useStore()`
- [ ] New `packages/web/src/features/categories/components/FavoriteCategoryPicker.tsx`:
      renders the favorites tile grid (icon-over-label, same visual style as the child
      tiles in `CategoriesPage.tsx`/`CategoryGroupBox`) filtered by transaction `type`,
      with the current `categoryId` appended as an extra tile if it isn't already a
      favorite. Empty-state message ("No favorites yet — tap Show all") when there are no
      favorites for this type — do not auto-open anything. "Show all" button below the grid
- [ ] `TransactionForm.tsx`: replace the direct `CategoryPicker` usage with
      `FavoriteCategoryPicker`. "Show all" opens a `Modal` (from
      `@/shared/components/ui/overlay`) containing the existing full `CategoryPicker`;
      selecting a category inside the modal closes it and sets `categoryId`
- [ ] i18n: add keys for the Settings summary row copy (Phase 1, if not already added
      there) and the empty-favorites message, VI + EN
- [ ] Add FE tests: `FavoriteCategoryPicker.test.tsx` covering favorites-grid rendering,
      empty state, current-selection-appended-when-not-favorited, "Show all" opens the
      modal with the full picker and selecting closes it. Update `TransactionForm.test.tsx`
      mocks to include whatever favorites shape `useStore()` now exposes

**Verification gate (hard):**
- [ ] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [ ] FE test suite passes
- [ ] Manual check in browser: star a category on the management page → confirm it shows
      in the transaction form's favorites grid → confirm the empty state when nothing is
      favorited for a type → confirm "Show all" opens the full hierarchy and selecting
      closes the modal → confirm editing a transaction whose category isn't a favorite
      still shows it appended in the grid

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all four phase branches.
