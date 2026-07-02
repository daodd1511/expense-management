# Category Redesign — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

Base branch for Phase 1: `main`. All phases stack sequentially (`phase-2` off `phase-1`,
`phase-3` off `phase-2`). Do not start a phase's PR/push without explicit confirmation
even if the phase's commits are already authorized.

---

## Phase 1 — Schema, Shared Types, API

Branch: `category-redesign/phase-1-schema-api` (off `main`)

- [x] Add `type` (`'expense'|'income'`, NOT NULL) and `parent_id` (nullable self-FK) to
      Supabase `categories` table — migration
      (`supabase/migrations/20260702053135_category_type_hierarchy.sql`), applied to linked
      remote project via `supabase db push`
- [x] Add DB-level constraints: child.type = parent.type; parent_id target must have
      parent_id IS NULL; a category with children cannot receive a parent_id — trigger in
      same migration, applied and verified live (see verification gate below)
- [x] Update `packages/shared/src/models/category.model.ts`: add `type`, `parentId`
- [x] Update `packages/shared/src/dtos/category.dto.ts`: row schema + create/patch schemas
- [x] Update `packages/shared/src/mappers/category.mapper.ts`: map `type`/`parent_id`
- [x] `packages/api/src/routes/categories.ts`:
  - [x] POST: require `type`, validate optional `parent_id` (exists, visible, same type,
        target has no parent_id itself)
  - [x] PATCH: `403` if `owner_id IS NULL`; allow `name`/`icon`/`color`/`parent_id`; reject
        `type` in body; validate re-parent target (same type, not itself a child, mover has
        no children)
  - [x] DELETE: `403` if system-owned; `409` if category has children
- [x] Wipe existing seeded categories in Supabase, reseed with new taxonomy from `PLAN.md`
      (12 expense parents + children, 4 income parents + children) — applied, counts verified
      live (65 total, 16 top-level, 52 expense / 13 income)
- [x] Add/update backend tests covering: type mismatch rejection, 403 on system category,
      409 on delete-with-children, re-parent validation

**Verification gate (hard, before marking phase done):**
- [x] `tsc --noEmit -p packages/shared/tsconfig.json` passes
- [x] `tsc --noEmit -p packages/api/tsconfig.json` passes
- [x] Backend test suite passes (direct vitest run, per known `pnpm` sandbox caveat)
- [x] Manual verify against live linked Supabase DB (migration applied,
      `pnpm exec supabase migration list` confirms local/remote both at
      `20260702053135`). Verified at DB trigger level in a rolled-back transaction (no data
      persisted): type-mismatch insert rejected, 3-level nesting rejected, parent-with-children
      re-parent rejected. Reseed confirmed: 65 rows, 16 top-level (12 expense + 4 income), 52
      expense / 13 income — matches PLAN.md taxonomy exactly.
      HTTP-level 403 (system category)/409 (delete-with-children)/type-immutable checks are
      covered by the 7 automated route tests in `categories.test.ts`, not re-verified via curl
      — no test-user Supabase auth JWT available this session to exercise `authMiddleware`.

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 2 — FE Data Layer

Branch: `category-redesign/phase-2-fe-data` (off `phase-1`)

- [x] Rebase onto `main` first if Phase 1 has since merged (per immediate-rebase rule) —
      not applicable, Phase 1 hasn't merged yet
- [x] `packages/web/src/features/categories/db.ts` + `queries.ts`: pass through `type`/
      `parentId` in create/patch payloads. Also had to update `store.tsx`'s
      `addCategory`/`updateCategory` signatures, `Settings.tsx` (added a type toggle, locked
      once set since type is immutable server-side), and `data.ts`'s dead mock seed — all
      required to satisfy the wider `Category` type, not in the original checklist wording
      but necessary for the typecheck gate to pass
- [x] `TransactionForm.tsx`: remove `INCOME_CATS` hack (line ~23) and its two usages;
      filter categories by `category.type === type`. Also removed a hardcoded `'salary'`
      default-select on the income tab (relied on a mock id that no longer exists now
      categories have real uuids) — switching type now just clears the selection if it
      doesn't match the new type
- [x] Budget screen: enforce leaf-or-parent-direct only — block selecting a category whose
      parent (or child) already has a budget in the same branch
- [x] Update/add FE tests covering the new type-based filter replacing `INCOME_CATS`

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [x] FE test suite passes (11/11: `api.test.ts`, `BudgetForm.test.ts` new,
      `TransactionForm.test.tsx` with 2 new cases)
- [ ] Manual check: switching transaction type tabs shows only matching-type categories —
      **not run**, no browser automation tool available this session (checked for a
      chrome/playwright MCP, none registered). Dev server started and served 200 OK on
      `/`, confirming it builds and boots, but the actual tab-switch/filter behavior was
      only exercised via the two new automated tests above, not visually in a browser

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 3 — FE UI (Picker + Colors)

Branch: `category-redesign/phase-3-fe-ui` (off `phase-2`)

- [x] Rebase onto updated base if Phase 2 has since merged — not applicable, Phase 2
      hasn't merged yet
- [x] Add `--chart-6` through `--chart-12` to `packages/web/src/shared/styles/globals.css`
      (`:root` and `.dark` blocks)
- [x] Category picker (mobile bottom sheet): grouped-collapsible — parent header (itself
      selectable) + indented children — new `CategoryPicker` component, `TransactionForm`
      is shared between mobile `BottomSheet` and desktop `Drawer` so one implementation
      covers both surfaces
- [x] Category picker (desktop drawer): same grouped-collapsible pattern — same component,
      see above
- [x] Assign colors: 12 distinct `chart-*` tokens across expense parents; income parents
      reuse `chart-1`...`chart-4`; children inherit parent color, override optional —
      already done in Phase 1's reseed migration, verified against the taxonomy table,
      no code change needed here
- [x] Assign icons per `PLAN.md` icon table (all pre-verified against installed
      `lucide-react`) — same, already done in Phase 1's reseed migration

**Verification gate (hard):**
- [x] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [ ] Manual check in browser: mobile + desktop picker both render grouped hierarchy
      correctly, donut chart shows 12 visually distinct expense colors, no color collisions
      — **not run**, no browser automation tool available this session (same gap as
      Phase 2). Covered instead by 6 new `CategoryPicker.test.tsx` cases (grouping,
      collapsed-by-default, no-toggle-on-leaf, auto-expand-on-selection, parent/child
      select) plus dev server smoke check (`pnpm --filter @wallet/web dev`, `/` → 200).
      `lib/derive.ts`'s `buildDonutData` reads `colorVar(category.color)` per-category —
      no hardcoded chart-1..5 list to update, so the 12-color claim rests on the reseed
      data + new tokens being correct, not on any donut-specific code

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all three phase branches.

**Addendum (post-completion):** user reported Settings' category management list showed no
parent/child distinction at all — a real gap, out of this checklist's original scope (which
only covered the transaction form's picker). Fixed: extracted `groupCategories()` out of
`CategoryPicker` into `packages/web/src/features/categories/group.ts`, Settings' flat grid
now renders the same grouped/indented hierarchy. `tsc` clean, FE suite green (17/17).
