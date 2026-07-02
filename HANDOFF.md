# Handoff — Category Redesign Phase 3 Complete (Final Phase)

## Context

- Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
- Branch: `category-redesign/phase-3-fe-ui` (off `category-redesign/phase-2-fe-data`)
- This was the final phase per `specs/category-redesign/EXECUTION.md`. All three phases
  are code-complete and gate-passed. Next step is push/PR/merge, all pending explicit
  go-ahead.

Read order: this file → `specs/category-redesign/EXECUTION.md` → `specs/category-redesign/PLAN.md`.

## Status: All 3 Phases Done, Verified, Partially Pushed

- Phase 1 (`category-redesign/phase-1-schema-api`): pushed to `origin`, no PR opened.
- Phase 2 (`category-redesign/phase-2-fe-data`): pushed to `origin` (including a later fix,
  see below), no PR opened.
- Phase 3 (`category-redesign/phase-3-fe-ui`): pushed to `origin`. Two follow-up commits
  landed after that push (Settings hierarchy display fix, Settings category UI redesign —
  see below) and have **not** been re-pushed yet.

PR descriptions for phase 1 and phase 2 were already handed to the user directly (not
regenerated here) — phase 1 targets `main`, phase 2 targets phase 1's branch. Phase 3 would
target phase 2's branch. After phase 3 merges, `EXECUTION.md` says delete all three phase
branches — don't do that until it's actually merged.

## Phase 2 addendum: budget re-parent fix

After Phase 2 was marked done and pushed, a Codex review of `specs/category-redesign/`
found a real gap: re-parent validation in `packages/api/src/routes/categories.ts` checked
type/depth/children but never checked budgets, so moving a budgeted leaf under an
already-budgeted parent silently violated the leaf-or-parent-direct rule server-side. Fixed
and pushed as an extra commit on `phase-2-fe-data` (`47f9d02`) rather than rewriting the
already-pushed `phase-1` branch. New test case added to `categories.test.ts` (now 8 cases).

## What changed in Phase 3

- `packages/web/src/shared/styles/globals.css`: added `--chart-6` through `--chart-12`
  (`:root` + `.dark`), hues spread across the gaps between the existing `chart-1..5` to
  stay visually distinct from each other and from the semantic income/expense/transfer
  colors.
- New `packages/web/src/features/categories/components/CategoryPicker.tsx`: replaces
  `TransactionForm`'s flat chip-list category selector with a grouped-collapsible list —
  parent header (itself selectable, collapsed by default) + indented children revealed on
  toggle, auto-expanding the group containing the current selection. Serves both mobile
  (`BottomSheet`) and desktop (`Drawer`) since `TransactionForm` is already the shared
  content inside both wrappers — no separate mobile/desktop picker was needed.
- Colors and icons for the reseeded taxonomy were **already correct** from Phase 1's
  migration (verified against `PLAN.md`'s table, no code change needed).
- `lib/derive.ts`'s `buildDonutData` already reads `colorVar(category.color)` per category
  — no hardcoded `chart-1..5` list to update, so the "12 visually distinct expense colors"
  claim rests on the reseed data + new CSS tokens, not on any donut-chart-specific code.

## Phase 3 addenda (post-push, unpushed)

- User reported Settings' category list had no parent/child visual distinction at all —
  out of the original Phase 3 checklist scope (only covered the transaction picker).
  Extracted `groupCategories()` out of `CategoryPicker` into
  `packages/web/src/features/categories/group.ts`; Settings now renders the same grouped
  hierarchy.
- Follow-up design feedback: Settings' category list redesigned into per-parent bordered
  "boxes" (icon+title header, children as a horizontal icon-over-label tile grid instead of
  a vertical indented list), and the always-inline edit/add panel was extracted into a new
  `CategoryForm` component shown in a `Drawer` (desktop) / `BottomSheet` (mobile) — same
  pattern `TransactionForm` already uses, instead of permanently pushing page content down.

## Known gap, deferred: system categories aren't editable — possible future feature

All 65 reseeded categories are `owner_id IS NULL` (system-owned) — confirmed via live query
(`select count(*) filter (where owner_id is null) ...` → 65/65). Phase 1's PATCH rule
correctly returns `403` on any system-owned category, per `PLAN.md`'s explicitly-confirmed
decision table. Net effect: **no category is currently editable by the user** — only new
categories created via Settings' "Add" button (which are user-owned) would be.

User wants this changed so their own default/seeded categories are editable, confirmed
this app will eventually be multi-user (other people signing in with their own accounts),
which rules out the simplest fix (just dropping the 403 check — that would let any user
edit the shared global taxonomy everyone else sees, a real correctness bug once a second
account exists).

The two options discussed, neither implemented yet:
1. **Re-seed as user-owned** per account, e.g. via a trigger on `auth.users` insert (or
   app-layer "seed defaults on first login") that gives every new user their own owned copy
   of the taxonomy. Correct for multi-user, but is new scope beyond `PLAN.md` — that spec
   explicitly ruled out copy-on-write personalization and specified system-parent +
   user-owned-child as *the* intended personalization path, not full system-category
   editability. This would reverse that confirmed decision, not just patch a bug.
2. Some other still-locked-but-personalizable model TBD.

Also, independent of that decision: the API 403 is currently a **silent failure** in the
UI — `useUpdateCategory`'s mutation has no `onError`, so a blocked edit just does nothing
visible. Worth fixing regardless of which direction #1 above goes.

Explicitly parked — user said "put it in possible feature for now," not to implement this
session. Next session should re-open this with the user before touching
auth/schema/migration for it (all hard-stop territory per `CLAUDE.md`).

## Verification Performed

- `tsc --noEmit -p packages/web/tsconfig.json` clean.
- Full FE suite green: 17/17 (added `CategoryPicker.test.tsx`, 6 new cases covering
  grouping, collapsed-by-default, no-toggle-on-a-childless-parent, auto-expand-on-selection,
  parent-select, child-select).
- Backend suite still green: 20/20 (includes the Phase 2 budget re-parent fix above).
- Dev server booted cleanly, `/` returned 200.
- **Not verified**: the manual browser check (mobile + desktop picker rendering, donut
  chart color distinctness) — no browser automation tool available this session, same gap
  as Phase 2. If a browser tool becomes available, or the user checks manually, this is the
  one remaining item before treating Phase 3 as fully gate-clean.

## Remaining Work

1. Push `category-redesign/phase-3-fe-ui` (needs explicit go-ahead, not yet given).
2. Open PRs for all three phases (stacked: phase-1→main, phase-2→phase-1,
   phase-3→phase-2) — needs explicit go-ahead. Note: `gh` in this session is authenticated
   as an account that can't see `daodd1511/expense-management`, so `gh pr create` fails
   here; PR descriptions were given to the user to create manually, or `gh auth login` as
   the right account first.
3. The manual browser check noted above, whenever a browser tool or the user is available.
4. After phase 3 merges: delete all three phase branches per `EXECUTION.md`'s instruction.
