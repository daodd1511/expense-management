# Category UX — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".

## STATUS

- Current phase: All phases complete
- Phase 1 — Settings sidebar + Categories page link: done
- Phase 2 — Categories management page: done
- Phase 3 — Favorites: done-with-debt
- Verification debt: manual browser checks (2 items) deferred; review checklist incomplete

---

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

- [x] New Supabase migration: `category_favorites` table exactly per `PLAN.md`'s "Schema
      Changes" section — applied to the linked remote project via `supabase db push`
      (`supabase migration list` confirms local/remote both at `20260702073013`)
- [x] `packages/shared/src/models/favorite.model.ts`: domain model `{ categoryId: string }`
- [x] `packages/shared/src/dtos/favorite.dto.ts`: row schema + create schema
- [x] `packages/shared/src/mappers/favorite.mapper.ts`: row ↔ domain mapping
- [x] Exported from `models/index.ts`, `dtos/index.ts`, `mappers/index.ts`, and the
      top-level `packages/shared/src/index.ts`. Also added `category_favorites` to
      `database.types.ts` (needed for the typed Supabase client)
- [x] New `packages/api/src/routes/favorites.ts`, mounted at `/favorites`:
  - [x] `GET /favorites`
  - [x] `POST /favorites` — idempotent via an app-layer existence check (select-then-insert,
        matching the style already used elsewhere in this router set rather than a DB
        upsert); the unique constraint is still the DB-level backstop
  - [x] `DELETE /favorites/:categoryId` — `404` if not favorited
- [x] Mounted `favoritesRouter` in `packages/api/src/index.ts`
- [x] Backend tests: `packages/api/src/routes/favorites.test.ts`, 5 cases

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/shared/tsconfig.json` passes
- [x] `tsc --noEmit -p packages/api/tsconfig.json` passes
- [x] Backend test suite passes (25/25, direct vitest run)
- [x] Manual verify against the live linked DB, in rolled-back transactions (nothing
      persisted): insert a favorite, duplicate insert rejected by the unique constraint,
      delete removes the row. FK-to-`auth.users` confirmed correct the hard way — a random
      uuid was rejected, had to use a real row from `auth.users`

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR — per this session's `/goal`, push is pre-authorized without re-asking each phase.

---

## Phase 3 — Favorites FE Data Layer

Branch: `category-ux/phase-3-favorites-fe-data` (off `phase-2`)

- [x] `packages/web/src/features/categories/favorites-db.ts`: `fetchFavorites`,
      `addFavoriteCategory`, `removeFavoriteCategory` API client functions
- [x] `packages/web/src/features/categories/favorites-queries.ts`: `useFavorites()`,
      `useAddFavorite()`, `useRemoveFavorite()`
- [x] `packages/web/src/core/store.tsx`: wired `favoriteCategoryIds: Set<string>`,
      `addFavorite`/`removeFavorite`, exposed via `useStore()`

**Note for future work in this area:** hit a real TS quirk — `useQuery().data` resolves to
`any` in this environment (TanStack Query v5 types not inferring cleanly here, pre-existing
and unrelated to this spec). Every other usage in the codebase silently masks it via an
explicit target-type annotation (`const categories: Category[] = catQuery.data ?? []` — `any`
is assignable to anything, no error). `new Set(favQuery.data ?? [])` was the first place this
surfaced as a real error, because inferring a generic from an `any` argument resolves to
`Set<unknown>`, not `Set<any>` — fixed with an explicit type argument:
`new Set<string>(...)`. Worth a real fix (TS/TanStack Query version bump) at some point, but
out of scope here.

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [x] FE test suite passes (17/17, unaffected — no UI consumes this layer yet)
- [x] Manual check: not applicable — no UI consumes this layer until Phase 4, skipped
      as planned

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 4 — Favorites UI (Management Toggle + Transaction Picker)

Branch: `category-ux/phase-4-favorites-ui` (off `phase-3`)

- [x] `CategoriesPage.tsx`: added a star toggle per category row/tile (parent box header
      + each child tile), calling `addFavorite`/`removeFavorite` from `useStore()`. Had to
      restructure the parent/child rows from single wrapping `<button>`s into sibling-button
      layouts (select button + separate star button) since a `<button>` can't nest inside a
      `<button>`
- [x] New `packages/web/src/features/categories/components/FavoriteCategoryPicker.tsx`:
      favorites tile grid filtered by transaction `type`, current `categoryId` appended if
      not already a favorite (deduped if it already is), empty-state message when nothing's
      favorited, "Show all" button
- [x] `TransactionForm.tsx`: `CategoryPicker` usage replaced with `FavoriteCategoryPicker`.
      "Show all" opens a `Modal` containing the existing full `CategoryPicker`; selecting
      inside it closes the modal and sets `categoryId`
- [x] i18n: `category.favorite`/`category.unfavorite`/`category.showAll`/
      `category.noFavorites`, VI + EN
- [x] FE tests: `FavoriteCategoryPicker.test.tsx` (6 cases: grid rendering, empty state,
      selection-appended, no-duplicate-when-already-favorited, select-calls-onSelect,
      show-all-opens-modal-and-selecting-closes-it). `TransactionForm.test.tsx`'s store mock
      updated with `favoriteCategoryIds: new Set(['food', 'salary'])` so the existing 3
      tests keep exercising the same selection flow without needing to open "Show all"

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [x] FE test suite passes (23/23)
- [ ] Manual check in browser: star a category on the management page → confirm it shows
      in the transaction form's favorites grid → confirm the empty state when nothing is
      favorited for a type → confirm "Show all" opens the full hierarchy and selecting
      closes the modal → confirm editing a transaction whose category isn't a favorite
      still shows it appended in the grid — **not run**, no browser automation tool
      available this session, consistent gap across every UI phase this session (Phase 1/3
      of `category-redesign`, Phase 1 of `category-ux`). Dev server smoke-checked instead.

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all four phase branches.
