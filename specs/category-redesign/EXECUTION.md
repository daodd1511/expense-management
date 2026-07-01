# Category Redesign — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

Base branch for Phase 1: `main`. All phases stack sequentially (`phase-2` off `phase-1`,
`phase-3` off `phase-2`). Do not start a phase's PR/push without explicit confirmation
even if the phase's commits are already authorized.

---

## Phase 1 — Schema, Shared Types, API

Branch: `category-redesign/phase-1-schema-api` (off `main`)

- [ ] Add `type` (`'expense'|'income'`, NOT NULL) and `parent_id` (nullable self-FK) to
      Supabase `categories` table
- [ ] Add DB-level constraints: child.type = parent.type; parent_id target must have
      parent_id IS NULL; a category with children cannot receive a parent_id
- [ ] Update `packages/shared/src/models/category.model.ts`: add `type`, `parentId`
- [ ] Update `packages/shared/src/dtos/category.dto.ts`: row schema + create/patch schemas
- [ ] Update `packages/shared/src/mappers/category.mapper.ts`: map `type`/`parent_id`
- [ ] `packages/api/src/routes/categories.ts`:
  - [ ] POST: require `type`, validate optional `parent_id` (exists, visible, same type,
        target has no parent_id itself)
  - [ ] PATCH: `403` if `owner_id IS NULL`; allow `name`/`icon`/`color`/`parent_id`; reject
        `type` in body; validate re-parent target (same type, not itself a child, mover has
        no children)
  - [ ] DELETE: `403` if system-owned; `409` if category has children
- [ ] Wipe existing seeded categories in Supabase, reseed with new taxonomy from `PLAN.md`
      (12 expense parents + children, 4 income parents + children)
- [ ] Add/update backend tests covering: type mismatch rejection, 403 on system category,
      409 on delete-with-children, re-parent validation

**Verification gate (hard, before marking phase done):**
- [ ] `tsc --noEmit -p packages/shared/tsconfig.json` passes
- [ ] `tsc --noEmit -p packages/api/tsconfig.json` passes
- [ ] Backend test suite passes (direct vitest run, per known `pnpm` sandbox caveat)
- [ ] Manual curl/verify: create category with type, attempt cross-type re-parent (expect
      reject), attempt PATCH on system category (expect 403), attempt delete parent with
      children (expect 409)

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 2 — FE Data Layer

Branch: `category-redesign/phase-2-fe-data` (off `phase-1`)

- [ ] Rebase onto `main` first if Phase 1 has since merged (per immediate-rebase rule)
- [ ] `packages/web/src/features/categories/db.ts` + `queries.ts`: pass through `type`/
      `parentId` in create/patch payloads
- [ ] `TransactionForm.tsx`: remove `INCOME_CATS` hack (line ~23) and its two usages;
      filter categories by `category.type === type`
- [ ] Budget screen: enforce leaf-or-parent-direct only — block selecting a category whose
      parent (or child) already has a budget in the same branch
- [ ] Update/add FE tests covering the new type-based filter replacing `INCOME_CATS`

**Verification gate (hard):**
- [ ] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [ ] FE test suite passes
- [ ] Manual check: switching transaction type tabs shows only matching-type categories

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 3 — FE UI (Picker + Colors)

Branch: `category-redesign/phase-3-fe-ui` (off `phase-2`)

- [ ] Rebase onto updated base if Phase 2 has since merged
- [ ] Add `--chart-6` through `--chart-12` to `packages/web/src/shared/styles/globals.css`
      (`:root` and `.dark` blocks)
- [ ] Category picker (mobile bottom sheet): grouped-collapsible — parent header (itself
      selectable) + indented children
- [ ] Category picker (desktop drawer): same grouped-collapsible pattern
- [ ] Assign colors: 12 distinct `chart-*` tokens across expense parents; income parents
      reuse `chart-1`...`chart-4`; children inherit parent color, override optional
- [ ] Assign icons per `PLAN.md` icon table (all pre-verified against installed
      `lucide-react`)

**Verification gate (hard):**
- [ ] `tsc --noEmit -p packages/web/tsconfig.json` passes
- [ ] Manual check in browser: mobile + desktop picker both render grouped hierarchy
      correctly, donut chart shows 12 visually distinct expense colors, no color collisions

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all three phase branches.
