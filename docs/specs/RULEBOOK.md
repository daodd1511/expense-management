# Spec-Driven Execution Workflow
<!-- rulebook v3 -->

Large/architectural changes flow: `/grill-me` → `docs/specs/<feature>/PLAN.md` →
`docs/specs/<feature>/EXECUTION.md` (via the `spec-plan` skill) → phased implementation
(via the `spec-phase` skill). Use `/grill-with-docs` instead of `/grill-me` when the
grilling should also maintain the glossary and ADRs (see `docs/DOMAIN-RULEBOOK.md`).
Design rationale for this workflow: `docs/specs/spec-workflow-v2/PLAN.md`.

This is the full rulebook. The spec skills read it when they run; it is deliberately kept
out of `CLAUDE.md` so sessions doing ordinary work don't carry it. The few invariants that
must bind agents who never trigger a spec skill live in `CLAUDE.md` → "Spec-Driven
Execution Workflow", which points here for everything else.

## State model
- **Git is the authoritative state store**: branch name encodes spec+phase
  (`<feature-slug>/phase-<n>-<desc>`), commits encode progress. Each `EXECUTION.md` opens
  with a **STATUS block** (current phase, per-phase state, verification debt) — the only
  prose trusted as state. **On any conflict, git wins silently** for mechanical facts
  (branch, commits, merged-or-not); STATUS is trusted only for what git can't express
  (debt, park reasons). `HANDOFF.md` is a session baton from `/handoff` — advisory context,
  never authority; do not resume from it.
- Phase states: `pending` / `in-progress` / `done` / `done-with-debt`. Gate items are
  `[ ]`/`[x]`; an item may be `[~]` (deferred) only when environment-blocked (missing
  tool/credentials, not effort), with substitute evidence inline and a mirrored STATUS debt
  entry. A phase is in-progress iff it has unchecked **non-deferred** items.
- `docs/specs/INDEX.md` is a **generated report** (`pnpm specs:index`), never hand-edited.
  After touching any STATUS block, rerun it and commit the regenerated INDEX.md in the same
  commit. STATUS blocks must keep the canonical format the script enforces (see
  `docs/specs/spec-index/PLAN.md`); the script fails loudly on drift. On conflict, git and
  STATUS win — INDEX.md is advisory, like `HANDOFF.md`.

## Branch model — stacked by default
- **Default: stacked.** Each phase branches off the **previous phase's branch** (phase 1
  off the integration branch, currently `develop`; resolve at plan time, never
  hardcode). Push → PR to the previous phase's branch (or to the integration branch if the
  previous phase already merged) → continue to the next phase without waiting for
  review/merge. Rebase onto the integration branch after an earlier phase's PR merges.
- **Sequential (off the integration branch, wait for merge) is opt-in only** — use it only
  when the user explicitly says so for this spec (e.g. "do phases sequentially" / "wait for
  merge before the next phase"). When opted in: each phase branches off the integration
  branch → push → PR → user reviews & merges → pull → next phase branches off the updated
  integration branch.
- After a phase's PR merges, ask before deleting the merged phase branch (local + remote).

## Checkpoints
- Starting a phase authorizes its commits — nothing else.
- Gate pass → one ask: "push + open PR?". Remote actions are never bundled with anything
  else.
- **Evidence before claims.** If you have not run the command in this message, you cannot
  say it passes. This binds every status claim: tests pass ⇒ runner output with 0 failures;
  build succeeds ⇒ exit 0; bug fixed ⇒ the original symptom retested; phase complete ⇒ the
  gate actually run. A prior run, a partial run, or "should pass" is not evidence, and
  checking a box is not running a command.
- A phase is complete only when its **agent gate** (typecheck, tests, build) actually
  passed **and the phase PR's CI is green**. The local gate is a pre-PR smoke check; CI's full run is authoritative, and red
  CI on a phase PR is the agent's to fix before the phase is done. Manual verification scenarios
  are the **review checklist**, listed in the PR description for the user to walk through
  before merging — they are the user's, not agent debt.
- **One spec in flight at a time.** Do not start or resume a different spec's phase while
  another has an unfinished phase. Finish the current phase, or explicitly **park** it with
  the user's go-ahead: a `WIP: parked <date>` commit on the phase branch plus a STATUS note
  (never `git stash` — stashes are invisible to a cold agent and easy to orphan).

## Capability baseline
- `docs/specs/capabilities/<area>.md` is the **current-state truth**: what the system does
  today, as `## Requirement: <title>` blocks with `### Scenario:` / `**WHEN**` / `**THEN**`
  steps. One file per capability area; split past ~300 lines. **The requirement title is the
  primary key** — entries are addressed by exact title, never by position.
- Every requirement carries a provenance line: `Origin: delta ← docs/specs/<feature>`,
  `Origin: backfill (test: <path>)`, or `Origin: backfill (user-confirmed)`.
- PLAN.md ends with a `## Spec Delta` section naming its capability and its entries:
  `### ADDED|MODIFIED|REMOVED Requirement: <title>`. **`MODIFIED` carries the complete
  post-change requirement text, not a diff** — applying is then a title-matched block swap
  a script can do, with no model judgment in the write path.
- The baseline is **written only from a merged delta or an evidence-backed backfill**, never
  hand-edited and never inferred from a code diff. It is applied post-merge by the
  `spec-archive` skill, which stops rather than reconciling a stale delta.
- **Lazy backfill (brownfield).** Existing behaviour enters the baseline only when a feature
  touches it — triggered when a delta needs a `MODIFIED` entry the baseline doesn't have.
  Backfill during the grill, by evidence class, never by the model's confidence:
  behaviour pinned by a **passing test** → transcribe it; **readable from code but untested**
  → draft it and get the user's confirmation; **requires inferring intent** → out of scope,
  leave it out. Never a bulk pass over the codebase.

Procedure lives in the skills — planning in the `spec-plan` skill, execution and resume in
the `spec-phase` skill, baseline application in the `spec-archive` skill — invoke the
relevant one rather than re-deriving it.
