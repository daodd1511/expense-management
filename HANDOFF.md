# Handoff

Session baton only — advisory context, not state. Trust git and any spec
`STATUS` blocks over this file for authoritative facts.

## Current State

- Branch: `develop`, at `8cb4d01` ("Conform category selection to the
  documented Chip, not invented UI"). Worktree clean.
- The stale version of this file (superseded by this write) described an
  interrupted `polish` Phase 1/2 session with a broken `DesktopAccounts.tsx`
  and uncommitted work — that has since been fully repaired, committed, and
  merged. Ignore that content; it no longer applies.
- `specs/polish/EXECUTION.md` — all 3 phases done, spec complete, merged into
  `develop`. `specs/foundation/EXECUTION.md` — also complete and merged.
  Don't resume either.
- `develop` also carries a separately-merged `auth-routing` spec (TanStack
  Router-based nav: `packages/web/src/routing/{router.tsx, app-pages.tsx,
  app-route-state.ts, transaction-overlay.ts, create-intent.ts}`) and a
  merged `feature-ux` spec, from work this chain has no first-hand authoring
  context on beyond the merge commits.

## What Shipped (most recent first)

- Category selection redesign: replaced ad-hoc dropdown/tile UI with the
  documented "Chip / Filter Pill" component from `docs/DESIGN.md` —
  `packages/web/src/features/categories/components/{CategoryChip.tsx,
  CategoryPicker.tsx, CategoryFilterSelect.tsx}`. Applied to both the
  transaction form picker and the transaction table's category filter.
  **Known, explicitly deferred divergence**: `FavoriteCategoryPicker` still
  uses an older bordered-tile pattern — left out of scope on the user's
  explicit call.
- Dashboard trend chart: replaced the buggy income/expense trend
  (`aggregateMonthlyTotals`, no zero-fill/window cap — showed "2 dots") with
  `computeBalanceTrend` (`packages/shared/src/finance.ts`), a zero-filled
  6-month cumulative balance series. New endpoint
  `GET /analytics/balance-trend`, new `BalanceTrendChart`
  (`packages/web/src/shared/components/Charts.tsx`).
  Renamed DTO `balanceTrendPointSchema`/`BalanceTrendPoint`.
- Subscription due-date computation moved server-side per explicit user
  request (was a client-side bug: stale `nextDueDate` after edits, plus a
  latent UTC-parse day-drift bug in `advanceNextDueDate`). Now
  `buildNextDueDate` takes an explicit `todayIso`/`today` param end-to-end —
  shared → API routes → web `db.ts` callers. Subscription form always
  recomputes `nextDueDate` from today on save (never trusts a stale value).
- Command palette (Cmd/Ctrl+K) + global keyboard shortcuts:
  `packages/web/src/shared/components/CommandPalette.tsx`,
  `shared/hooks/useKeyboardShortcuts.ts`, `routing/create-intent.ts`
  (`?create=` token for palette-driven "new X" actions).
- Subscription confirm-payment button auto-creating a transaction, and a
  loading-states pass (bootstrap screens, submit/delete/sign-in/subscription
  pending states) — from the combined polish Phase 1+2 commit.

## Notes For Next Agent

- **Read `docs/DESIGN.md` before writing any UI/styling code in this repo.**
  Learned the hard way earlier in this chain: a first attempt at the
  category redesign ignored this doc, got built as ad-hoc dropdown/tile UI,
  and had to be scrapped and redone once the doc's actual "Chip" spec was
  found. This is now a hard rule, not optional.
- No browser tool has been available in this session chain — all UI changes
  are typecheck/test/build-verified only, never visually confirmed. Disclose
  this explicitly if reporting UI work as complete.
- Commit convention: plain imperative subject, no type/scope prefix. Always
  invoke the `terse-commit` skill before `git commit` in this repo.
- Before starting new spec work, check `specs/*/EXECUTION.md` STATUS blocks
  for anything still `in-progress` (one-spec-in-flight rule) — as of this
  write, `polish` and `foundation` are both fully done and merged, so the
  slate is clear.

## Backlog

Reference: [docs/BACKLOG.md](docs/BACKLOG.md) — re-check items against
`git log` before picking one, since shipped items above (analytics, category
select UI, subscription confirm-payment, keyboard shortcuts/palette) may
still be listed there unpruned.

## Suggested Skills

- `spec-plan` / `grill-me` — for phasing the next backlog batch
- `spec-phase` — only if resuming an existing `specs/<slug>/EXECUTION.md`
- `react-frontend-developer` — required for frontend code generation per
  project CLAUDE.md
- `terse-commit` — before any `git commit`
- `capture` — to log new out-of-scope issues noticed mid-task
- `handoff` — to refresh this document at the next session boundary
