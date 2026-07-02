---
name: spec-plan
description: Turn a /grill-me PLAN.md into a phased specs/<feature>/EXECUTION.md ready for the spec-phase skill to run. Use when a grill session just produced a PLAN.md with no EXECUTION.md yet, or when the user says "make the execution plan", "break this into phases", "turn PLAN.md into an execution file".
argument-hint: "<feature-slug> — the specs/<feature-slug>/PLAN.md must already exist"
---

Produces `specs/<feature-slug>/EXECUTION.md` from `specs/<feature-slug>/PLAN.md`. This skill
only plans phases and writes the checklist file — it does not write code. Once EXECUTION.md
exists, hand off to the `spec-phase` skill to actually run a phase.

## Step 0 — Load state

1. Read `specs/<feature-slug>/PLAN.md` in full. If it doesn't exist, stop and ask for the
   slug or tell the user to run `/grill-me` first.
2. Check whether `specs/<feature-slug>/EXECUTION.md` already exists. If it does and has any
   checked-off items, stop — regenerating would destroy execution history. Ask the user
   whether they want to append new phases or start over (only start over if they explicitly
   say so).
3. Read root `HANDOFF.md` and `git branch --show-current` to see what's already in flight,
   so branch bases are correct.

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

Split further only where PLAN.md's own sections imply a real dependency boundary (e.g. a
data migration that must be verified before UI work depends on the new shape). Do not split
by "this felt like a lot" — a phase should be independently verifiable and independently
revertable.

For each phase, decide:
- Branch name: `<feature-slug>/phase-<n>-<short-desc>`.
- Base: `main` for phase 1; the previous phase's branch for phase N (stacked, per
  `CLAUDE.md`'s workflow rules).

## Step 3 — Write each phase's checklist

Every checklist item must name the actual file(s)/function(s)/table(s) from PLAN.md — pull
these directly from PLAN.md's own "Schema Changes" / "API Changes" / "Frontend Changes"
sections rather than re-deriving them from scratch. Vague items ("update the backend") are
not acceptable; an agent picking up the phase cold should not have to re-read all of
PLAN.md to know where to start.

Include, per phase:
- The checklist itself, ordered so earlier items unblock later ones within the phase.
- A **Verification gate (hard)** section: typecheck command(s) scoped to the
  packages/projects the phase touches, test suite, and a manual-verification step specific
  to what changed (list exact scenarios to check, not "test it works").
- An **On completion** line: update checklist, update root `HANDOFF.md`, stop and ask before
  push/PR — this must be present verbatim on every phase, it's a hard rule from
  `CLAUDE.md`, not optional boilerplate to skip for brevity.

## Step 4 — Assemble EXECUTION.md

Header structure to match (see any existing `specs/*/EXECUTION.md` for the exact shape):
- Title, link to `PLAN.md`, one-line pointer to `CLAUDE.md`'s workflow section.
- Read order note: `HANDOFF.md` (root) → this file → `PLAN.md`.
- Base-branch / stacking note.
- One `## Phase N — <name>` section per phase from Step 2/3.

Write the file. Do not create branches or touch code yet.

## Step 5 — Hand off

Report to the user: number of phases, what each covers, any open items you flagged in Step 1
and how they were resolved. Ask whether to proceed into Phase 1 now via the `spec-phase`
skill — do not auto-start execution, starting a phase's branch and commits still needs the
explicit go-ahead `spec-phase`'s own Step 2 requires.

## Do not

- Do not write code, create branches, or run typecheck/tests — this skill only produces the
  plan file.
- Do not invent scope beyond what PLAN.md decided. If something feels missing, ask whether
  it belongs in this feature's plan or is out of scope, don't quietly add it.
- Do not silently resolve an "Open Items" entry from PLAN.md that affects schema, auth, or
  anything hard to reverse — that's Step 1's job, don't skip it under time pressure.
- Do not regenerate an EXECUTION.md that already has checked-off progress without explicit
  confirmation.
