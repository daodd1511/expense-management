# Handoff

Session baton only — advisory context, not state. Trust git and any spec
`STATUS` blocks over this file for authoritative facts.

## Current State

- Branch: `develop`, worktree clean. `develop` == `origin/develop` at
  `55d0a4a`. `main` == `origin/main` at `a93a413` (a merge of `develop` into
  `main`, so `main` already has everything below). Nothing pending push.
- All prior stale content in this file (an interrupted `polish`/`foundation`
  session) has been fully superseded — those specs are long done and merged;
  don't resume them.
- No spec has an `in-progress` phase right now (checked every
  `specs/*/EXECUTION.md` STATUS block). Slate is clear for new spec work.

## What Shipped (most recent first, this session)

- **Mobile nav simplification** (`55d0a4a`): removed the "Planning" combo
  screen (`layouts/mobile/MobilePlanning.tsx`, deleted) now that the bottom
  nav is Home/Accounts/Reports/Other — Budgets and Subscriptions are now
  standalone mobile pages. Fixed a real gap this exposed: Budgets was
  unreachable from the Other hub (only Subscriptions was linked, mislabeled
  "Planning"). Also promoted Categories out of Settings into a peer
  top-level destination: desktop sidebar item (between Accounts and
  Settings), mobile Other hub. Its back-link now returns to Other on mobile,
  hidden entirely on desktop.
- **Reports feature** (`21cb284`, corrected in `7a9731d`): new `/reports`
  page — monthly income/expense/net totals, expense category breakdown with
  drill-down to transactions, expense donut chart with per-category
  percentages. Full detail: `specs/reports/PLAN.md` and
  `specs/reports/EXECUTION.md`.
  - **Architectural change bundled in the same commit, repo-wide**: the
    transaction add/edit form no longer routes through `/transactions/new`
    or `/transactions/$transactionId/edit` — those routes are gone. A new
    `TransactionOverlayProvider`/`useTransactionOverlay()` context
    (`packages/web/src/features/transactions/transaction-overlay.tsx`) opens
    the form over *any* page without unmounting it. Any future work
    touching transaction create/edit must call this context
    (`openCreate(month)` / `openEdit(id, month)`), not navigate to the old
    routes.
  - New `packages/web/src/shared/components/MobilePageContainer.tsx` —
    default `p-4` wrapper now used by every mobile-only page. New mobile
    pages should use it rather than hand-rolling padding (that inconsistency
    is what caused the Reports/Other edge-spacing bug fixed this session).
  - **Known debt, recorded in `specs/reports/EXECUTION.md` STATUS**: all 3
    phases landed as one commit on `reports/phase-1-api-contract` instead of
    the stacked phase-2/phase-3 branches the plan called for (now merged and
    the branch deleted, so this is permanent history, not fixable
    retroactively — team judgment call was not worth unwinding). The
    "Review checklist (user, at PR review)" items in that file are
    **unverified** — no browser automation or live Supabase session was
    available in this sandbox to drive the app end-to-end. Worth an actual
    manual pass if you have a browser handy.
  - Kanagawa theme (palette + matte pass) predates this session's work but
    was the most recent thing merged before it; see `specs/kanagawa-theme/`
    if styling questions come up.

## Notes For Next Agent

- **No browser tool has been available in this session chain** — all UI
  work is typecheck/test/build-verified only, never visually confirmed.
  Disclose this explicitly if reporting UI work as complete.
- **Direct pushes to `develop`/`main` get blocked by the auto-mode
  classifier** (protected-branch policy) unless the user's instruction
  clearly authorizes bypassing PR review. If blocked, stop and ask rather
  than trying to work around it.
- Commit convention: plain imperative subject, no type/scope prefix. Always
  invoke the `terse-commit` skill before `git commit` in this repo.
- `docs/BACKLOG.md`'s "Reports: monthly report, category drill-down..."
  Features line is now shipped and stale — prune it next time you're in
  that file (not done this session, out of scope for a nav-cleanup pass).
- Before starting new spec work, check `specs/*/EXECUTION.md` STATUS blocks
  for anything `in-progress` (one-spec-in-flight rule) — clear as of this
  write.

## Backlog

Reference: [docs/BACKLOG.md](docs/BACKLOG.md) — re-check items against
`git log` before picking one; the Reports line noted above is stale.

## Suggested Skills

- `spec-plan` / `grill-me` — for phasing the next backlog batch
- `spec-phase` — only if resuming an existing `specs/<slug>/EXECUTION.md`
- `react-frontend-developer` — required for frontend code generation per
  project CLAUDE.md
- `terse-commit` — before any `git commit`
- `capture` — to log new out-of-scope issues noticed mid-task (e.g. the
  stale Reports backlog line above)
- `verify` — this session leaned entirely on typecheck/test/build; if a
  browser becomes available, use this to actually drive the reports/nav
  changes before trusting them further
- `handoff` — to refresh this document at the next session boundary
