# Handoff

Session baton only — advisory context, never authoritative state. Spec state lives in
git + each `specs/*/EXECUTION.md` STATUS block (see `CLAUDE.md` → "Spec-Driven Execution
Workflow"). Rewritten to this shape as part of spec-workflow-v2's migration.

## Current

- `error-handling`: all 3 phases merged to `develop` via PRs #10–12. Spec complete.
- Workflow v2 (`specs/spec-workflow-v2/PLAN.md`) applied on branch `spec-workflow-v2`:
  rewrote `CLAUDE.md` rulebook section + both spec skills. Old `specs/*/EXECUTION.md`
  files predate v2 and stay untouched as history.
- Next spec in queue: `be-integration` (PLAN.md exists, no EXECUTION.md yet) — first spec
  to run under the v2 rules.

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
