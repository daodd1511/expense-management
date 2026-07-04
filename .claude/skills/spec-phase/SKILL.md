---
name: spec-phase
description: Drive phased execution of a spec produced by /grill-me — start the next phase, or resume mid-phase work correctly. Use when the user says "start phase N", "continue the spec", "resume execution", "next phase", or references a specs/<feature>/EXECUTION.md.
argument-hint: "<feature-slug> [phase-n] — omit phase-n to auto-detect where to resume"
---

Drives execution of `specs/<feature-slug>/PLAN.md` + `specs/<feature-slug>/EXECUTION.md`.
The rulebook (state model, branch model, gate lanes, checkpoints, parking) is `CLAUDE.md` →
"Spec-Driven Execution Workflow" — this skill is the procedure that implements it.

## Step 0 — Locate state from git first

1. Run `git status` and `git branch --show-current`. The branch name encodes spec+phase;
   the working tree and commit log encode progress. **This is the authoritative state.**
2. Read `specs/<feature-slug>/EXECUTION.md` — its STATUS block and checklist (ask the user
   for the slug if not given and the current branch doesn't encode it — do not guess
   between multiple specs under `specs/`).
3. If STATUS disagrees with git on a mechanical fact (which branch exists, what's
   committed, what's merged), **git wins silently** — correct STATUS to match, no
   user-reconciliation ceremony. STATUS is only trusted for what git can't express:
   verification debt, park reasons, phase intent.
4. Read `specs/<feature-slug>/PLAN.md` for the decisions the phase must honor.
5. `HANDOFF.md`, if present, is advisory context only (why something was parked, what the
   user said) — never resume from it, never treat it as state.
6. **One-spec-in-flight check**: scan other `specs/*/EXECUTION.md` STATUS blocks. If a
   different spec has an `in-progress` phase, stop — the user must finish or park it
   before this spec proceeds.

## Step 1 — Decide: resume, or start the next phase

- A phase is **in-progress** iff it has unchecked **non-deferred** items — `[~]` deferred
  items do not count as unfinished. If the current branch matches an in-progress phase →
  **resume**: continue from the first unchecked item, do not re-do checked items, do not
  re-ask for authorization (the original phase-start already covers it).
- If the current phase is `done` or `done-with-debt` and merged → **start next phase**:
  requires a fresh explicit go-ahead from the user, do not assume it.
- If the checklist is fully checked but the agent gate was never actually run → stop, run
  the gate now, before anything else.

## Step 2 — Starting a new phase

1. Determine the base per EXECUTION.md's branch model. **Stacked (default):** the
   previous phase's branch — even if its PR hasn't merged yet; phase 1 bases off the
   integration branch. **Sequential (only if opted in for this spec):** checkout the
   integration branch, `git pull`, and wait for the previous phase's PR to merge before
   basing off it.
2. Create branch `<feature-slug>/phase-<n>-<short-desc>` from that base. If stacked and an
   earlier phase in the chain has since merged to the integration branch, rebase this
   phase's branch onto the integration branch before starting new work.
3. Work the checklist top to bottom. Commit at logical sub-steps (never one giant commit).
   Check off each `EXECUTION.md` item immediately when done — not batched at the end.
4. Do not push or open a PR without a separate explicit go-ahead, even though the commits
   themselves were pre-authorized by starting the phase.

## Step 3 — Completing a phase

1. Run the **agent gate** exactly as written in `EXECUTION.md` (typecheck, tests, build).
   All must actually pass. An item may become `[~]` deferred only if environment-blocked
   (missing tool/credentials, not effort) — record substitute evidence inline and mirror
   it in STATUS's verification-debt list; the phase state is then `done-with-debt`.
2. **Commit-integrity check**: `git status` must be clean, and every new file this phase
   introduced must appear in `git show --stat` of a commit on the phase branch — a file
   described in a commit message but never `git add`ed has happened before.
3. Update the STATUS block and checkboxes to reflect reality.
4. Report to the user: phase complete, N commits, gate results — then one ask: **"push +
   open PR?"** (target: the previous phase's branch if stacked and still unmerged, else the
   integration branch). The PR description must include the phase's **Review checklist**
   lane, so manual verification happens in the user's review before they merge.

## Step 4 — After the user merges

1. Checkout the integration branch, `git pull`.
2. Ask before deleting the merged phase branch (local + remote).
3. If a later phase is already stacked on the branch that just merged, rebase that phase's
   branch onto the integration branch now — don't wait for it to become the active phase.
4. Update STATUS (phase → `done`, or `done-with-debt` if debt remains). Then, if phases
   remain, ask whether to start the next one (Step 2).

## Step 5 — Parking (mid-phase stop)

If work must stop before a phase completes (user redirects, session ends mid-flight):
commit uncommitted work as `WIP: parked <date>` on the phase branch, and note in STATUS
that the phase is parked and why. Never `git stash` — stashes are detached from branches
and invisible to a cold agent. Resume = checkout the branch, continue, squash-or-keep the
WIP commit at the next real commit.

## Do not

- Do not resume from `HANDOFF.md` — state comes from git + STATUS only.
- Do not silently start a new phase without a fresh explicit go-ahead.
- Do not push, open a PR, or merge without a separate explicit confirmation, regardless of
  how much of the phase's commit work was pre-authorized.
- Do not wait for the previous phase's PR to merge before starting the next one unless
  sequential mode was explicitly opted into for this spec — stacking is the default.
- Do not mark `[~]` for anything that is merely tedious — deferral is for environment
  blocks only, with evidence.
- Do not squash a phase's commits into one, and do not batch-check the checklist at the end.
