# Handoff — Category Redesign Phase 1 Complete

## Context

- Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
- Branch: `category-redesign/phase-1-schema-api` (off `main`)
- Current objective for next session: start Phase 2 (`category-redesign/phase-2-fe-data`,
  branched off phase-1) — see `specs/category-redesign/EXECUTION.md`

Read order: this file → `specs/category-redesign/EXECUTION.md` → `specs/category-redesign/PLAN.md`.

## Phase 1 Status: Done, Verified, Not Pushed

All checklist items and the verification gate in `EXECUTION.md` are checked off. Not pushed
or opened as a PR yet — needs explicit go-ahead per the workflow's hard-stop rule.

What changed:
- `supabase/migrations/20260702053135_category_type_hierarchy.sql` — adds `type`
  (`expense|income`, NOT NULL) and `parent_id` (nullable self-FK) to `categories`; trigger
  enforces child.type = parent.type, 2-level depth cap, and "category with children can't
  itself become a child"; hard-wipes and reseeds the taxonomy from `PLAN.md`. **Applied** to
  the linked remote Supabase project via `supabase db push`
  (`supabase migration list` confirms local/remote both at `20260702053135`).
- `packages/shared`: `category.model.ts`, `category.dto.ts`, `category.mapper.ts`,
  `database.types.ts` updated for `type`/`parentId`.
- `packages/api/src/routes/categories.ts`: POST validates `parentId` (exists, visible,
  same type, not itself nested); PATCH returns 403 on system-owned categories and rejects
  `type` in the body; re-parent validation (same type, target not itself a child, mover has
  no children); DELETE returns 403 system-owned / 409 has-children.
- `packages/api/src/lib/http.ts`: `ApiErrorStatus` extended with 403/409.
- New `packages/api/src/routes/categories.test.ts` (7 cases).

## Verification Performed

- `tsc --noEmit` clean on `packages/shared` and `packages/api`.
- Full backend vitest suite green (19/19), run directly per the known `pnpm` sandbox
  caveat (see "Important Environment Constraint" below).
- Live DB verification against the linked remote project, run inside
  `begin...rollback` transactions (nothing persisted):
  - type-mismatch child insert → rejected by trigger
  - 3-level nesting attempt → rejected by trigger
  - re-parenting a category that has children → rejected by trigger (isolated from the
    type-mismatch case with a same-type target)
  - reseed row counts confirmed exact: 65 total, 16 top-level (12 expense + 4 income),
    52 expense / 13 income — matches `PLAN.md` taxonomy table
- Not verified: HTTP-level 403/409/type-immutable behavior via live curl — no test-user
  Supabase auth JWT was available this session to pass `authMiddleware`. That logic is
  covered by the 7 automated route tests instead (mocked `userId`, not a live token).

## Known Assumption to Revisit

The migration assumes `categories.id` is `uuid` (Supabase default convention) — there was
no prior schema dump or migration history in this repo to confirm against. It applied
cleanly, so this is now confirmed correct in practice.

## Important Environment Constraint

`pnpm` is unreliable in this sandbox after dependency changes (tries to recreate workspace
`node_modules`, hits network isolation). Workaround: use direct binaries —
`./node_modules/.bin/vitest run <path>` and `/Users/thomasduong/.volta/bin/tsc --noEmit -p <tsconfig>` —
instead of `pnpm test` / `pnpm exec tsc`.

`supabase db push` also attempts to pull a Docker image (`public.ecr.aws/supabase/edge-runtime`)
for an unrelated part of its flow; this can fail/hang on an expired registry auth token. It's
unrelated to migration application — check `supabase migration list` to confirm the migration
itself landed rather than trusting the push command's exit state.

## Remaining Work

1. Phase 2 (`category-redesign/phase-2-fe-data`, off phase-1): wire `type`/`parentId`
   through `packages/web/src/features/categories/db.ts` + `queries.ts`; remove the
   `INCOME_CATS` hack in `TransactionForm.tsx` (lines ~23, 66-68, 120) in favor of
   `category.type === type` filtering; enforce leaf-or-parent-direct budget selection.
2. Phase 3 (`category-redesign/phase-3-fe-ui`, off phase-2): `--chart-6`...`--chart-12`
   CSS tokens, grouped-collapsible category picker (mobile + desktop), color/icon
   assignment per `PLAN.md`.
3. Before Phase 1 branch is pushed/PR'd: explicit user go-ahead required (not yet given).
