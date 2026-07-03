---
name: spec-plan
description: Turn a /grill-me PLAN.md into a phased specs/<feature>/EXECUTION.md ready for the spec-phase skill to run. Use when a grill session just produced a PLAN.md with no EXECUTION.md yet, or when the user says "make the execution plan", "break this into phases", "turn PLAN.md into an execution file".
argument-hint: "<feature-slug> — the specs/<feature-slug>/PLAN.md must already exist"
---

Produces `specs/<feature-slug>/EXECUTION.md` from `specs/<feature-slug>/PLAN.md`. This skill
only plans phases and writes the checklist file — it does not write code. Once EXECUTION.md
exists, hand off to the `spec-phase` skill to actually run a phase.

The rulebook (state model, branch model, gate lanes, checkpoints) is `CLAUDE.md` →
"Spec-Driven Execution Workflow" — this skill implements it, not restates it.

## Step 0 — Load state

1. Read `specs/<feature-slug>/PLAN.md` in full. If it doesn't exist, stop and ask for the
   slug or tell the user to run `/grill-me` first.
2. Check whether `specs/<feature-slug>/EXECUTION.md` already exists. If it does and has any
   checked-off items, stop — regenerating would destroy execution history. Ask the user
   whether they want to append new phases or start over (only start over if they explicitly
   say so).
3. **One-spec-in-flight check**: scan the STATUS blocks of every other
   `specs/*/EXECUTION.md`. If another spec has a phase in `in-progress` (or uncommitted
   work on its branch), stop — don't plan a new spec on top of one mid-flight; the user
   must finish or park it first.
4. Resolve the **integration branch** (check `CLAUDE.md`, then `git branch` for the
   convention in use — currently `develop`). Name it explicitly in EXECUTION.md; never
   write a hardcoded assumption.

## Step 1 — Surface ambiguity before phasing anything

PLAN.md often ends with an "Open Items" / "TBD at implementation time" section, or contains
decisions phrased as ranges ("check constraint vs. trigger — TBD"). Do not silently pick one
and bake it into the checklist — a wrong guess here means rework discovered mid-phase or,
worse, an unreviewed assumption shipped in a migration.

- List every open item / unresolved mechanism found in PLAN.md.
- For anything that changes what files get touched, what a checklist item says to build, or
  is hard to reverse (schema/migration shape, id types, auth/infra choices) — ask the user
  before writing it into a checklist item.
- For anything genuinely inconsequential to phase structure (e.g. exact error message
  wording) — proceed and note the judgment call inline in the checklist item so it's visible
  at execution time, don't stop to ask.

## Step 2 — Derive phase boundaries

Phases split along dependency layers, not arbitrary size. Common shape for a full-stack
feature (adjust to what PLAN.md actually describes — don't force a fixed phase count):

1. Schema / shared types / API — nothing downstream can start without this landing first.
2. Frontend data layer — wiring the new fields/endpoints through without touching UI.
3. Frontend UI — the part users actually see.

Split further only where PLAN.md's own sections imply a real dependency boundary. Do not
split by "this felt like a lot" — a phase should be independently verifiable and
independently revertable, because **each phase merges into the integration branch via its
own PR before the next phase starts** (sequential model — see rulebook).

For each phase: branch name `<feature-slug>/phase-<n>-<short-desc>`, based off the
integration branch (every phase — no stacking by default).

## Step 3 — Write each phase's checklist and gates

Every checklist item must name the actual file(s)/function(s)/table(s) from PLAN.md — pull
these directly from PLAN.md's own "Schema Changes" / "API Changes" / "Frontend Changes"
sections rather than re-deriving them. Vague items ("update the backend") are not
acceptable; an agent picking up the phase cold should not have to re-read all of PLAN.md to
know where to start.

Gates come in **two lanes**:

- **Agent gate (hard)**: typecheck command(s) scoped to the packages the phase touches,
  test suite, build. Must pass before the PR is opened. Only write items here the agent can
  actually run in this environment. If an agent-owed check is foreseeably
  environment-blocked (needs credentials, a live service), say so in the item now — at
  execution time it becomes `[~]` with substitute evidence, per the rulebook.
- **Review checklist**: the manual scenarios (browser walkthroughs, visual checks) the
  *user* verifies while reviewing the PR. spec-phase copies this lane into the PR
  description. These never block phase completion and never become agent debt.

## Step 4 — Assemble EXECUTION.md

Use this skeleton exactly (do not copy the shape from older `specs/*/EXECUTION.md` files —
they predate v2 and carry stale conventions):

```markdown
# <Feature> — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `<resolved-branch>`.

## STATUS

- Current phase: <n> — <state: pending | in-progress | done | done-with-debt>
- Phase 1 — <name>: <state>
- Phase 2 — <name>: <state>
- Verification debt: none

## Phase <n> — <name>

Branch: `<feature-slug>/phase-<n>-<short-desc>` (off `<integration-branch>`)

<one line: why this is one phase — the dependency boundary it sits on>

- [ ] <item naming exact files/functions>

**Agent gate (hard):**
- [ ] <typecheck / test / build commands>

**Review checklist (user, at PR review):**
- [ ] <manual scenario>

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.
```

Write the file. Do not create branches or touch code yet.

## Step 5 — Hand off

Report to the user: number of phases, what each covers, any open items you flagged in Step 1
and how they were resolved. Ask whether to proceed into Phase 1 now via the `spec-phase`
skill — do not auto-start execution, starting a phase still needs the explicit go-ahead
`spec-phase`'s own procedure requires.

## Do not

- Do not write code, create branches, or run typecheck/tests — this skill only produces the
  plan file.
- Do not invent scope beyond what PLAN.md decided. If something feels missing, ask whether
  it belongs in this feature's plan or is out of scope, don't quietly add it.
- Do not silently resolve an "Open Items" entry from PLAN.md that affects schema, auth, or
  anything hard to reverse — that's Step 1's job, don't skip it under time pressure.
- Do not regenerate an EXECUTION.md that already has checked-off progress without explicit
  confirmation.
- Do not put agent-unrunnable manual checks in the agent gate — they belong in the review
  checklist lane.
