# Spec Workflow v2 — Redesign of spec-plan / spec-phase

Grilled 2026-07-03. Redesign of the spec-driven execution workflow from first principles,
motivated by an architecture review of the current skills against 4 executed specs
(`pwa`, `error-handling`, `category-redesign`, `category-ux`). The review found the two
high-severity failures shared one root cause: the workflow's state model could not express
execution reality (deferred verification, session-vs-durable state lifetimes).

## Goal

**Cold-resume fidelity** is the workflow's primary job: any agent, any session, zero
memory, can pick up mid-flight and continue without re-deriving decisions or repeating
work. Execution discipline and traceability are secondary (CLAUDE.md's hard stops already
cover safety).

## Decisions

### 1. State model — git-derived + thin STATUS block

- Git is the primary state store: branch name encodes spec+phase, commits encode progress.
- Each `EXECUTION.md` gains a small structured **STATUS** section at the top: current
  phase, per-phase state, verification-debt list. This is the only prose an agent trusts
  as state.
- Narrative prose is banned from the state path — anything an agent must trust is either
  in git or in STATUS.
- Precedence: on conflict, **git wins silently** for mechanical facts (branch, commits,
  merged-or-not); STATUS is trusted only for what git can't express (debt, park reasons).
  No user-reconciliation ceremony for mechanical mismatches — correct STATUS and move on.

### 2. HANDOFF.md — advisory only, never state

- `HANDOFF.md` is the output of the general-purpose `/handoff` session compactor; it is a
  **session baton between adjacent sessions**, not durable spec state. Conflating those
  two lifetimes was the root architecture bug.
- Spec skills resume from git + STATUS alone. They may read HANDOFF.md for soft context
  (why something was parked, what the user said) but never trust it as authority — no
  mismatch-reconciliation ceremony, because it isn't authoritative.
- `/handoff` itself is unchanged; per its own no-duplication rule it references STATUS
  instead of restating per-phase detail, so it shrinks for free.

### 3. Phase states — 4 states + debt ledger

- Phase states: `pending` / `in-progress` / `done` / `done-with-debt`.
- Gate items keep `[ ]`/`[x]`; an environment-blocked item may be marked `[~]` deferred —
  only with substitute evidence recorded inline and a mirrored entry in STATUS's debt list
  stating exactly what a capable session must run.
- `done-with-debt` is a first-class terminal state: the next phase may start; debt
  survives until burned down.
- Resume test: a phase is in-progress iff it has unchecked **non-deferred** items.

### 4. Branch model — sequential PR-per-phase, stack only as exception

- Default: phase branch off the **integration branch** (currently `develop` — resolve at
  plan time, never hardcode) → push → PR to integration branch → user reviews & merges →
  agent pulls → next phase.
- No stacking by default: no rebase cascades, PR diffs always clean against the
  integration branch.
- Exception (opt-in only): if the user explicitly says "keep going while I review", the
  next phase stacks on the unmerged branch and rebases onto the integration branch after
  merge.
- After a phase's PR merges: pull the integration branch, then ask before deleting the
  merged phase branch (local + remote) — branch cleanup is owned by spec-phase's
  after-merge step.

### 5. Authorization checkpoints

- Phase-start authorizes that phase's commits (unchanged).
- Gate-pass triggers one ask: "push + open PR?" — remote actions never bundled with
  anything else.
- User's merge + "start phase N+1" is the next checkpoint. No new rules; existing hard
  stops fit this shape.

### 6. Verification — two gate lanes; manual checks belong to PR review

- `spec-plan` writes gates in two lanes:
  - **Agent gate**: typecheck, tests, build — must pass before the PR is opened.
  - **Review checklist**: manual scenarios, listed in the PR description for the user to
    walk through before merging.
- The `[~]`/debt mechanism survives only for genuinely agent-owed items blocked by
  environment (e.g. a JWT-gated live API check).
- Rationale: 4 specs of "manual browser check — not run" debt proves the browser check was
  never realistically the agent's to run; the user reviews every PR anyway.

### 7. Skill layout — two skills, rulebook in CLAUDE.md

- Keep `spec-plan` and `spec-phase` separate (different moments, different outputs).
- The shared rulebook — state vocabulary, branch model, gate lanes, checkpoints,
  one-spec-in-flight — lives in the rewritten "Spec-Driven Execution Workflow" section of
  `CLAUDE.md` (~30 lines). Skills contain only procedure and defer to it.
- CLAUDE.md placement keeps the rules enforced even when neither skill is invoked (the
  one-spec-in-flight incident happened outside a skill invocation).

### 8. Parking — WIP commit, never stash

- Parking a phase = `WIP: parked <date>` commit on the phase branch + STATUS note (parked,
  why). Branch stays put.
- Resume = checkout, continue, later squash-or-keep.
- Stash is banned for parking: detached from branches, easy to orphan, invisible to a cold
  agent (nearly lost work once already).

### 9. Enforcement additions carried over from the review

- One-spec-in-flight checked at `spec-phase` Step 0 **and** `spec-plan` Step 0 (scan other
  specs' STATUS blocks; stop if another spec has an unfinished phase).
- Commit-integrity check at phase completion: `git status` clean, and every new file the
  phase introduced appears in `git show --stat` of a commit on the phase branch.
- `spec-plan` embeds a ~15-line EXECUTION.md skeleton in the skill itself (no more
  template-by-example drift).

## Migration — forward-only

- `error-handling` finishes under the old stacked model (push stacked PRs when ready;
  GitHub retargets as they merge).
- New rules apply from the next spec (`be-integration`).
- Old EXECUTION.md files stay untouched as history.
- HANDOFF.md gets trimmed to advisory shape once error-handling lands.

## Deliverable

Direct edits, one reviewed commit series (no EXECUTION.md — phasing a 4-file docs change
is ceremony):

1. `CLAUDE.md` — rewrite "Spec-Driven Execution Workflow" section (the rulebook, §7).
2. `.claude/skills/spec-plan/SKILL.md` — STATUS block + two-lane gates + embedded
   skeleton + in-flight check.
3. `.claude/skills/spec-phase/SKILL.md` — git-first resume, new state vocabulary,
   sequential-PR procedure, parking, commit-integrity check.

Edits should land on a fresh branch off `develop` (not on
`error-handling/phase-3-fe-forms-inline-errors`), after or independent of error-handling's
push — they touch no code the spec branches touch.

## Out of scope

- `/handoff` skill changes (already compliant; benefits automatically).
- Fixing the `gh` account mismatch (operational, tracked in HANDOFF.md).
- Browser-automation tooling for agent-side manual checks.
