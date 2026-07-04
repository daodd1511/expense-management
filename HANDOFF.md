# Handoff

Session baton only — advisory context, never authoritative state. Spec state lives in
git + each `specs/*/EXECUTION.md` STATUS block (see `CLAUDE.md` → "Spec-Driven Execution
Workflow"). Rewritten to this shape as part of spec-workflow-v2's migration.

## Current

- `mobile-ux`: **planned and committed, no phase started.** `specs/mobile-ux/PLAN.md` +
  `specs/mobile-ux/EXECUTION.md` (5 phases, all `pending`) are on `develop` (commits
  `a575c64`, `c7681dd`). Next action is Phase 1 via `spec-phase`; needs the user's
  go-ahead before branching/committing. Phase/decision detail lives in those two files —
  do not restate here.
  - Scope came from 6 hands-on mobile issues + 2 folded-in backlog items (optimistic
    updates, pull-to-refresh). Backlog cleanup (remove those 2 lines from
    `docs/BACKLOG.md`) is wired into Phases 4 and 5, not yet done.
  - Grill overrides worth remembering: zoom fix is viewport `maximum-scale=1` (user chose
    it over 16px inputs, accessibility cost accepted); categories redesign is "Direction A"
    (sectioned rows) applied to **both** mobile + desktop.
  - Branch model is **stacked by default** (see next bullet) — Phase 2 bases off Phase 1's
    branch, not off `develop`, and doesn't wait for Phase 1's PR to merge.
- **Branch model flipped**: `CLAUDE.md`/`AGENTS.md` now say phases stack by default
  (previous phase's branch, no waiting for merge); sequential/wait-for-merge is opt-in per
  spec only when the user explicitly asks (commit `a7c0887`). This reverses the prior
  "sequential, no stacking" rule.
- **Spec-skill triplication found and resolved**: `spec-plan`/`spec-phase` existed in three
  places — `.claude/skills/` (project, "v2" — richest), `.agents/skills/` (project, older),
  and `~/.claude/skills/` (global — this is the copy that actually ran for `/spec-plan`
  earlier, and it was also the older, non-v2 version). All three are now byte-identical and
  reflect stacked-by-default (commit `de07aa9`; global copy updated outside git, not in any
  commit). If skill behavior ever seems off, check `~/.claude/skills/` hasn't drifted from
  `.claude/skills/` again — nothing keeps them in sync automatically.
- `specs/mobile-ux/EXECUTION.md` was rewritten (`c7681dd`) from the old single-gate shape to
  the current v2 skeleton: each phase now has separate **Agent gate (hard)** (typecheck/test,
  agent-runnable) and **Review checklist** (manual scenarios, user's job at PR review) lanes.
  Scope unchanged, format only.
- Added Codex subagent mirrors of `.claude/agents/*`: `.codex/agents/{explorer,reporter,
  tweaker,implementer,checker}.toml` (commit `d6f2321`). Model tiers mapped explicitly —
  opus/sonnet/haiku → gpt-5.5/gpt-5.4/gpt-5.4-mini — per user's instruction, not inferred.
  Codex has no per-tool allowlist, so the old `tools:` restrictions became `sandbox_mode`
  (`read-only` vs `workspace-write`) plus prose; `checker` needs `workspace-write` for
  `pnpm build` despite never editing source.
- Prior shipped context (still true): `error-handling` all 3 phases merged (PRs #10–12);
  `category-redesign` + `category-ux` specs fully checked off / shipped — `CategoriesPage`
  exists as its own page. Workflow v2 rulebook is live in `CLAUDE.md`/`AGENTS.md`.
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
