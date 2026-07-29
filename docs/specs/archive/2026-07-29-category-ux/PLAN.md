# Category UX Plan

Produced via `/grill-me` interview. All decisions below were explicitly confirmed; do not
reinterpret or expand scope without re-confirming.

## Motivation

Two usability gaps surfaced after the `category-redesign` spec shipped:

1. Settings' category management block (grouped boxes + add/edit form) is long — 16 parent
   groups, dozens of children — and cramped inside a `Card` on the Settings page alongside
   appearance/language/account settings.
2. `TransactionForm`'s `CategoryPicker` shows the full grouped-collapsible hierarchy inline
   every time, which is a lot of UI for the common case of picking one of a few
   frequently-used categories.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Categories page navigation | Drill-down only, reached via a link/row in Settings — not a new bottom-tab / sidebar item | Mobile nav is a fixed 5-slot layout, desktop sidebar has 6 items; neither has room, and this isn't a destination someone jumps to directly |
| Back navigation | In-content back button inside the new page component itself, not shared mobile header chrome | Desktop already puts back-navigation and titles inside each screen's own content (no shared per-screen header there); doing the same on mobile keeps both platforms consistent and avoids special-casing `MobileApp`'s shared header |
| What moves out of Settings | The entire category CRUD block: grouped-box list, "Add" button, and the `CategoryForm` Drawer/BottomSheet. Settings keeps only a summary link row (e.g. "Categories · 65 ›") | User confirmed: move it all out, not just part |
| List height clamp | Removed (`max-h-[32rem] overflow-y-auto` on the list) | No longer squeezed into a Settings `Card`; full page can scroll naturally |
| Favorite definition | Explicit, user-marked — not computed from transaction frequency | User confirmed "explicit" over computed after tradeoffs were laid out |
| Favorite storage | New `category_favorites` join table (`user_id`, `category_id`), not a column on `categories` | Most categories are system-owned rows shared by every user (65/65 today); a boolean column on `categories` would make one user's favorite show for everyone once multi-user lands (confirmed coming) |
| Favorite marking UI | Star toggle on the categories management page only, not inline in the transaction picker | Keeps the picker's tap target unambiguous (tap = select); favoriting is an occasional setup action, not a mid-entry one |
| Favorites view in picker | Flat grid of icon-over-label tiles (same visual language as Settings' child tiles), not the grouped-collapsible list | Favorites aren't hierarchical — a flat shortlist is the point |
| "Show all" | Button below the favorites grid opens the existing full grouped-collapsible `CategoryPicker` inside a `Modal` | Avoids stacking a BottomSheet-on-BottomSheet / Drawer-on-Drawer; `Modal` already exists in `overlay.tsx` and works identically on both platforms |
| Empty favorites state | Show a subtle "No favorites yet — tap Show all" message in place of the tile grid; do not auto-open the modal | No surprise popups; user opts into the full picker |
| Current selection not in favorites | Append it as an extra tile at the end of the favorites grid, so editing a non-favorite-categorized transaction still shows what's selected without opening the modal | Otherwise editing such a transaction shows a favorites grid with nothing visibly selected — confusing |
| Favorites cap | None | Simplest; can add a cap later if it turns out to matter |

---

## Schema Changes

```
category_favorites   NEW TABLE
  id            uuid primary key default gen_random_uuid()
  user_id       uuid not null references auth.users(id)
  category_id   uuid not null references categories(id) on delete cascade
  created_at    timestamptz not null default now()

  unique (user_id, category_id)
```

No changes to `categories`, `transactions`, `budgets`, or `subscriptions`.

---

## API Changes

New `packages/api/src/routes/favorites.ts`, mounted at `/favorites`, mirroring the
`budgets.ts` pattern (simple owner-scoped resource):

- `GET /favorites` — list current user's favorite category ids
- `POST /favorites` — body `{ categoryId }`, insert `(user_id, category_id)`; idempotent
  (return existing row / 200 rather than erroring on duplicate, since the UI just toggles a
  star and shouldn't need to track prior state to avoid a 409)
- `DELETE /favorites/:categoryId` — remove the `(user_id, category_id)` row; `404` if not
  favorited

`packages/shared`: new `favorite.model.ts` / `favorite.dto.ts` / `favorite.mapper.ts`
following the existing per-resource file split (see `category.model.ts` etc. for the
pattern). Domain model is just `{ categoryId: string }` — no need to expose the join
table's own `id`/`created_at` to the frontend.

---

## Frontend Changes

### New categories page

- `Screen` (mobile) / `Tab` (desktop) unions gain a `'categories'` value — **not** added to
  either `NAV` array.
- New `packages/web/src/features/categories/components/CategoriesPage.tsx` (variant-aware,
  mirrors the `DesktopSettings`/`MobileSettings` split): contains the grouped-box list (no
  height clamp), "Add" button, star-toggle per category row/tile, and the `CategoryForm`
  Drawer/BottomSheet — moved wholesale out of `Settings.tsx`.
- In-content "← Back" button at the top of the page, `onClick` sets screen/tab back to
  `'settings'`.
- `Settings.tsx`: category `Card` section shrinks to a single summary link row ("Categories
  · {n} ›") that navigates to `'categories'`.

### Favorites data layer

- `packages/web/src/features/categories/favorites-queries.ts` (or folded into existing
  `queries.ts`): `useFavorites()`, `useAddFavorite()`, `useRemoveFavorite()`, following the
  existing TanStack Query + `useStore` wiring pattern used for categories/budgets.
- `useStore` gains `favoriteCategoryIds: Set<string>` plus `addFavorite`/`removeFavorite`.

### Transaction picker redesign

- `CategoryPicker` usage inside `TransactionForm` is replaced by a new composed component
  (e.g. `FavoriteCategoryPicker`) that renders:
  - Favorites tile grid (icon-over-label, same style as Settings' child tiles), filtered to
    the current transaction `type`, with the current `categoryId` appended if it isn't
    already a favorite
  - Empty state message when there are no favorites for this type
  - "Show all" button opening a `Modal` containing the existing full `CategoryPicker`
    (grouped-collapsible); selecting a category there closes the modal

---

## Explicitly Out of Scope

- Inline favorite-toggling from within the transaction picker (star button or long-press)
- A cap on the number of favorites
- Computed/frequency-based favorites (may revisit later; explicit was chosen for v1)
- Any change to the system-category-editability gap logged in root `HANDOFF.md` — unrelated
  to this spec, still parked separately
- Adding `'categories'` as a top-level nav item

## Open Items for Implementation Time

- Exact copy for the Settings summary row and the empty-favorites message (i18n keys, VI +
  EN) — not decided during the interview, straightforward to fill in during execution
- Whether `POST /favorites` should be genuinely idempotent at the DB level (`ON CONFLICT DO
  NOTHING`) or check-then-insert at the app layer — implementation detail, doesn't change
  behavior either way
