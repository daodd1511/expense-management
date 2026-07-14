---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design that also maintains the domain model as it goes — updating the CONTEXT.md glossary and offering ADRs the moment terms and hard-to-reverse decisions crystallise. Use when the user wants to grill a design AND capture its vocabulary/decisions durably.
disable-model-invocation: true
---

Run a `/grill-me` session while applying the `domain-modeling` skill throughout.

The grilling drives the design decisions; `domain-modeling` captures their
durable residue as they surface:

- When a term is disputed, overloaded, or newly coined during the interview,
  resolve it and write it into `CONTEXT.md` inline (glossary only — no
  implementation detail).
- When the interview lands a decision that is app-wide, hard to reverse, and a
  real trade-off, offer an ADR in `docs/adr/`. Feature-scoped decisions stay in
  the spec's `PLAN.md`, not an ADR (see `CLAUDE.md` → "Domain Model & Decisions").

Everything else about the grilling is unchanged: the output is still a
`docs/specs/<feature>/PLAN.md`, ready for the `spec-plan` skill.
