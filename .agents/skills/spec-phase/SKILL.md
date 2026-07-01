---
name: spec-phase
description: Drive phased execution of a spec produced by /grill-me — start the next phase, or resume mid-phase work correctly. Use when the user says "start phase N", "continue the spec", "resume execution", "next phase", or references a specs/<feature>/EXECUTION.md.
argument-hint: "<feature-slug> [phase-n] — omit phase-n to auto-detect where to resume"
---

Drives execution of `specs/<feature-slug>/PLAN.md` + `specs/<feature-slug>/EXECUTION.md`.
Full workflow rules (branching, authorization, gates) live in `CLAUDE.md` under
"Spec-Driven Execution Workflow" — read that first, this skill is the procedure that
implements those rules, not a restatement of them.

## Step 0 — Always locate state first, before touching anything

1. Read root `HANDOFF.md` if it exists — it may already point at an active spec/phase/branch.
2. Read `specs/<feature-slug>/EXECUTION.md` (ask the user for the slug if not given and
   `HANDOFF.md` doesn't resolve it — do not guess between multiple specs under `specs/`).
3. Read `specs/<feature-slug>/PLAN.md` for the decisions the phase must honor.
4. Run `git status` and `git branch --show-current`. Compare against what the checklist
   says the current phase's branch should be (`<feature-slug>/phase-<n>-<desc>`).
5. Determine actual state from evidence, not from what `HANDOFF.md` claims — if the current
   branch, uncommitted diff, or checklist checkmarks disagree with `HANDOFF.md`, trust the
   repo, flag the mismatch to the user, and ask before proceeding.

## Step 1 — Decide: resuming a phase, or starting the next one

- If the current branch matches an in-progress phase (checklist has unchecked items for
  that phase) → **resume**: continue from the first unchecked item, do not re-do checked
  items, do not re-ask for authorization (the original phase-start already covers it).
- If the current phase's checklist is fully checked and its verification gate already
  passed → **start next phase**: this requires a fresh explicit go-ahead from the user, do
  not assume it.
- If the current phase's checklist is fully checked but the verification gate was never
  actually run (or `HANDOFF.md`/checklist disagree about it) → stop, run the gate now,
  before doing anything else.

## Step 2 — Starting a new phase

1. Confirm with the user before cutting the branch if there's any ambiguity about which
   phase is next or what its base should be.
2. Determine the base: `main` for phase 1, otherwise the previous phase's branch. If the
   previous phase has since merged to `main`, rebase this phase's branch onto `main` before
   starting new work (per the immediate-rebase rule in CLAUDE.md).
3. Create branch `<feature-slug>/phase-<n>-<short-desc>` from that base.
4. Work the checklist top to bottom. Commit at logical sub-steps (never one giant commit).
   Check off each `EXECUTION.md` item immediately when done — not batched at the end.
5. Do not push or open a PR without a separate explicit go-ahead, even though the commits
   themselves were pre-authorized by starting the phase.

## Step 3 — Completing a phase

1. Run the phase's verification gate exactly as written in `EXECUTION.md` (typecheck,
   tests, manual check). All must actually pass — do not mark the phase done on partial or
   assumed results.
2. Update `EXECUTION.md` checkboxes to reflect reality.
3. Update root `HANDOFF.md`: which phase just finished, its branch, verification results,
   what phase is next, current checked-out branch.
4. Report to the user: phase complete, N commits, gate results, and ask explicitly whether
   to push + open the PR (target per CLAUDE.md's stacked-PR rule: phase-1 → `main`,
   phase-N → phase-(N-1)'s branch).

## Step 4 — Mid-session or mid-phase cutoff

If work stops before a phase completes (session end, or user redirects elsewhere), update
`HANDOFF.md` with exactly which checklist items are done vs. in-flight, and which branch is
checked out — this is what lets the next invocation of this skill resume correctly at
Step 0 instead of re-deriving state from scratch.

## Do not

- Do not skip Step 0's repo-evidence check and trust `HANDOFF.md` blindly — it can go stale.
- Do not silently start a new phase without a fresh explicit go-ahead.
- Do not push, open a PR, or merge without a separate explicit confirmation, regardless of
  how much of the phase's commit work was pre-authorized.
- Do not squash a phase's commits into one, and do not batch-check the checklist at the end.
