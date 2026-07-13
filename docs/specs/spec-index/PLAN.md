# Spec Index — Plan

status: done

A generated `docs/specs/INDEX.md` giving a single kanban-style view of every spec's state
(done / in progress / pending / not started), so status doesn't have to be assembled by
opening ten EXECUTION.md files.

## Decisions (from grill session, 2026-07-06)

| Topic           | Choice                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync model      | **Script-generated**, never hand-edited. File carries a "generated — do not edit" banner.                                                                                                                                                                                       |
| Trigger         | Agents run `pnpm specs:index` at spec checkpoints (whenever a STATUS block changes) and commit the regenerated INDEX.md alongside. Manual runs anytime. No git hooks.                                                                                                           |
| Parse strategy  | **Normalize once, strict parser.** One-time pass rewrites all existing STATUS blocks to the canonical format below; the script exits nonzero naming the offending file on any non-conforming block.                                                                             |
| Status taxonomy | Four states + debt flag: **Not started** = `PLAN.md` only; **Pending** = EXECUTION.md exists, no phase begun; **In progress** = any phase `in-progress`; **Done** = all phases `done`/`done-with-debt`. Debt renders in its own column (⚠ + short note), not as a fifth status. |
| Odd specs       | `be-integration` (PLAN-only) → Not started. `spec-workflow-v2` → excluded via a `status: reference` marker line in its PLAN.md that the script recognizes; listed under a small Reference section at the bottom of INDEX.md.                                                    |
| Layout          | One table, sorted In progress → Pending → Not started → Done. Columns: Spec (linked to PLAN.md), Status, Phases (`n/m`), Debt, Description.                                                                                                                                     |
| Rule home       | CLAUDE.md "Spec-Driven Execution Workflow" section gains one line: after touching any STATUS block, run `pnpm specs:index` and commit the regenerated INDEX.md with it. Global `~/.claude/skills` are **not** edited.                                                           |
| Script          | Plain Node `.mjs` at `scripts/spec-index.mjs`, zero dependencies (Node 22 runs it directly). Root `package.json` script `specs:index`.                                                                                                                                          |

## Canonical STATUS format (the contract the parser enforces)

```markdown
## STATUS

- Current phase: <n> — <state> # or: All phases complete
- Phase <n> — <name>: <state> # state ∈ pending | in-progress | done | done-with-debt (no backticks)
- Verification debt: none # or a short one-line description
```

Multi-line debt descriptions collapse to one line during normalization. Phase counts for
the `n/m` column come from the `Phase <n>` lines; a spec is Pending when every phase is
`pending`.

## Judgment calls (not asked, noted here)

- **Description column**: derived tolerantly (it's cosmetic, unlike status) — first
  non-empty, non-heading line of PLAN.md, truncated to ~100 chars. No new required
  frontmatter in PLAN files.
- **Reference marker**: a literal `status: reference` line anywhere in the first 10 lines
  of a spec's PLAN.md.

## Scope of work

1. `scripts/spec-index.mjs` — strict STATUS parser + table generator as specified above.
2. Root `package.json` — add `"specs:index": "node scripts/spec-index.mjs"`.
3. One-time normalization pass over all existing `docs/specs/*/EXECUTION.md` STATUS blocks
   (10 files) — format only, no state changes.
4. Add `status: reference` marker to `docs/specs/spec-workflow-v2/PLAN.md`.
5. Generate the initial `docs/specs/INDEX.md`.
6. CLAUDE.md — add the regenerate-at-checkpoint rule to the Spec-Driven Execution
   Workflow section, and note INDEX.md is generated/advisory (git + STATUS still win).

## Non-goals

- No git hooks, no CI wiring, no watch mode.
- No changes to `~/.claude/skills/spec-plan` or `spec-phase`.
- INDEX.md never becomes a source of truth — it is a derived report; on conflict, git and
  STATUS blocks win, same as HANDOFF.md.
- No per-phase kanban (rows are specs, not phases).
