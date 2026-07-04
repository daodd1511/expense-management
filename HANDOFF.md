# Handoff

Session baton only — advisory context, never authoritative state. Spec state lives in
git + each `specs/*/EXECUTION.md` STATUS block (see `CLAUDE.md` → "Spec-Driven Execution
Workflow"). Rewritten to this shape as part of spec-workflow-v2's migration.

## Current

- `mobile-ux`: **just planned, nothing started.** `/grill-me` → `specs/mobile-ux/PLAN.md`
  → `specs/mobile-ux/EXECUTION.md` (5 phases, all `pending`). Files are untracked on
  `develop` — not committed. Next action is Phase 1 via `spec-phase`; needs the user's
  go-ahead before branching/committing. Phase/decision detail lives in those two files —
  do not restate here.
  - Scope came from 6 hands-on mobile issues + 2 folded-in backlog items (optimistic
    updates, pull-to-refresh). Backlog cleanup (remove those 2 lines from
    `docs/BACKLOG.md`) is wired into Phases 4 and 5, not yet done.
  - Grill overrides worth remembering: zoom fix is viewport `maximum-scale=1` (user chose
    it over 16px inputs, accessibility cost accepted); categories redesign is "Direction A"
    (sectioned rows) applied to **both** mobile + desktop.
  - Phases branch off `develop` sequentially (no stacking) per `CLAUDE.md`, overriding the
    spec-plan skill's default stacking language.
- Prior shipped context (still true): `error-handling` all 3 phases merged (PRs #10–12);
  `category-redesign` + `category-ux` specs fully checked off / shipped — `CategoriesPage`
  exists as its own page. Workflow v2 rulebook is live in `CLAUDE.md`.
- `be-integration` (PLAN.md, no EXECUTION.md) remains queued but is **not** the active
  spec — `mobile-ux` is. One spec in flight at a time.

## Repo-wide notes (not owned by any spec)

- `packages/api/package.json` `dev` script watches bundled output (`dist/`), not source —
  local API edits don't trigger reload. Known, unfixed.
- `packages/web/src/core/store.tsx` `deleteTransactions` loops per-id deletes instead of
  using the unused `useDeleteTransactions` bulk hook. Behavior-preserving, out of scope
  when noticed.
- Manual browser verification for pwa + error-handling was never run by an agent (no
  browser tool). Under v2 this class of check is the user's, at PR review.
- `gh` CLI account mismatch (`daoduong-saritasa` vs `daodd1511`) previously blocked PR
  creation — PRs #10–12 exist now, so possibly resolved; verify with `gh auth status`
  before relying on it.

## Suggested skills

- `spec-phase` — to start/resume `mobile-ux` phase execution (reads `EXECUTION.md` STATUS).
- `react-frontend-developer` — all `mobile-ux` work is frontend; required by `CLAUDE.md`.
- `terse-commit` — before any commit in this repo (repo convention).
- `capture` — if out-of-scope issues surface mid-work, backlog them rather than expanding
  the spec.
