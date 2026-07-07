# Handoff

Session baton only — advisory context, not state. Trust git and any spec
`STATUS` blocks over this file for authoritative facts.

## Current State

- Branch: `develop`, ahead of `origin/develop` by one commit (`2429d8f`, not
  pushed). Uncommitted worktree changes as of this write:
  `docs/specs/be-integration/PLAN.md`,
  `docs/specs/docs-dashboard/PLAN.md` (both gained a `status: done` marker),
  and the regenerated `docs/specs/INDEX.md` — not committed yet, do so (via
  `terse-commit`) before starting anything else so they don't get bundled
  into unrelated work.
- All prior content in this file (a `polish`/`foundation`/nav-cleanup session)
  is superseded — that work is long merged, don't resume it.
- **No spec has an `in-progress` phase.** `docs/specs/transaction-running-balance/EXECUTION.md`
  has Phase 1 done, Phase 2/3 `pending` — the natural next spec to resume if
  picking up execution work, not something abandoned mid-flight.

## What Shipped (most recent first, this session)

- **`system-category-translations` plan + ADR** (`2429d8f`): grilled design
  for localizing system category display names server-side (API selects by
  locale) rather than in the web client. New `docs/adr/0005-...md` and
  `docs/specs/system-category-translations/PLAN.md`. Not started — planning
  only, no `spec-plan`/`EXECUTION.md` yet.
- **Reports donut overflow fix** (`06d6bfc`): the center-overlay total on
  `CategoryDonut` (`shared/components/Charts.tsx`) spilled past the ring on
  large amounts — `max-w-[72%]` exceeded the actual inner-hole diameter
  (`innerRadius="64%"`). Fixed by moving the Reports page's total display
  above the chart instead of inside it; `CategoryDonut` gained a
  `showCenterTotal` prop (default `true`) so Dashboard's two donuts
  (`MobileHome`, `DesktopDashboard`) keep the old center-total look — they
  weren't asked about and may have the same latent overflow risk at large
  amounts, just not raised yet.
- **`log_subscription` RPC type-mismatch fix** (`5304df2`): the function's
  `RETURNS TABLE` declared `tx_amount`/`sub_amount` as `numeric`, but the
  actual `transactions.amount`/`subscriptions.amount` columns are `bigint` —
  every call failed with "structure of query does not match function result
  type". Fixed via a **new** migration
  (`20260707080000_fix_log_subscription_amount_types.sql`) that drops and
  recreates the function with corrected types (`create or replace` can't
  change OUT-parameter types) — the original migration was left untouched
  per the immutable-migration rule.
- **Income/expense foreground contrast fix** (`2db99b6`): badge/tab text on
  income/expense backgrounds (`--income-foreground`/`--expense-foreground`
  in `globals.css`) was near-black on both mid-tone colors. Now near-white
  in both light-theme tokens and dark-theme expense; dark-theme income stays
  dark deliberately — that green is bright enough (`L=0.748`) that white
  text there would be close to unreadable. Affects every consumer of these
  tokens app-wide (transaction type tabs, account/subscription icon badges,
  offline banner, desktop nav badge), not just the one spot reported.
- **`transaction-time` support** (`66a3b7f`): added `tx_time` to
  `Transaction`, threaded through DTO/mapper/API/UI — Phase 1 prerequisite
  for `docs/specs/transaction-running-balance/`.
- **`balance-adjustment` and `transfer-fee` plans** (`ab373c4`, `ac550ce`):
  grilled and written, not yet run through `spec-plan`. Both introduce a new
  `isHidden` boolean on `Category` (system-generated categories that
  shouldn't appear in manual pickers) — `transfer-fee`'s header explicitly
  says not to duplicate that field if `balance-adjustment` lands first.
  Budget rollover was considered and explicitly **deferred** by the user
  (not enough real budget usage yet to justify it) — see
  `docs/BACKLOG.md`'s Features section.
- **`docs-dashboard`** (`5dc6697`, marked done this session): a hand-rolled,
  zero-npm-dependency Markdown→HTML generator (`scripts/docs-dashboard.mjs`,
  `pnpm docs:dashboard`) that renders all of `docs/` (specs board, ADRs,
  design docs, backlog, root `CONTEXT.md`) into one self-contained,
  auto-opened local HTML file with a live filter and tabbed Plan/Execution
  per spec. Reuses `scripts/spec-index.mjs`'s STATUS parser rather than
  reimplementing it; `docs/dashboard.html` itself is gitignored.
- **Domain glossary + ADRs + docs restructure** (`344831e`): adopted
  `domain-modeling`/`grill-with-docs` skills — `CONTEXT.md` is now a
  glossary-only ubiquitous-language doc, `docs/adr/` holds app-wide
  hard-to-reverse decisions, feature-scoped decisions stay in each spec's
  `PLAN.md`. Also the point where `specs/` moved to `docs/specs/` and
  `DESIGN.md`/`PRODUCT.md` moved to `docs/design/` (user did this reorg
  directly; this commit was the reference-fixing sweep across the repo).
- **Shared `AccountSelect`** (`72f82f3`): extracted from `TransactionForm`
  and reused in `SubscriptionForm`, replacing a native `<select>` there (and
  the subscription form's month-of-year native select too) — audit was
  triggered by the user spotting the inconsistency; the shared `Select`
  component (`shared/components/ui/select.tsx`) is now the only pattern in
  use for dropdowns anywhere in the app.

## Notes For Next Agent

- **No browser tool has been available in this session chain** — all UI
  fixes (donut overflow, contrast) are code-reasoned + typecheck-verified
  only, never visually confirmed live. Disclose this explicitly if asked to
  report UI work as complete. A `seed.md` at the repo root (gitignored-style,
  not committed) has a generative SQL seed script for a test account if you
  need realistic data volume to actually exercise the app.
- **Direct pushes to `develop`/`main` get blocked by the auto-mode
  classifier** (protected-branch policy) unless the user's instruction
  clearly authorizes bypassing PR review. If blocked, stop and ask.
- Commit convention: plain imperative subject, no type/scope prefix. Always
  invoke the `terse-commit` skill before `git commit` in this repo — no
  exceptions observed this session, keep it that way.
- **Never edit an already-applied Supabase migration file**, even for a
  comment — write a new corrective migration instead (see the
  `log_subscription` fix above for the pattern: `drop function` + recreate,
  since `create or replace` can't change return types).
- Two plans (`balance-adjustment`, `transfer-fee`) share the new `isHidden`
  Category field — whichever spec's `spec-plan`/implementation runs first
  should add it; the other should detect and reuse it, not duplicate.
- `docs/BACKLOG.md` Features section, current as of this write: Export &
  backup, Household sharing (deferred), Offline write queue, Small UX batch,
  Better analytics, Add adjustment account (now planned, see above), Add fee
  feature (now planned, see above), Better credit card info. Budget rollover
  is deferred (see above). Re-check against `git log`/`docs/specs/` before
  picking one — several of these now have plans that supersede the one-line
  entry.

## Backlog

Reference: [docs/BACKLOG.md](docs/BACKLOG.md) — re-check items against
`git log` and `docs/specs/` before picking one; several one-liners above now
have full plans that supersede them.

## Suggested Skills

- `spec-plan` — to turn `balance-adjustment/PLAN.md`, `transfer-fee/PLAN.md`,
  or `system-category-translations/PLAN.md` into a phased `EXECUTION.md`
- `spec-phase` — to resume `transaction-running-balance/EXECUTION.md` Phase 2
  (Backend balance calculation), the only spec with real in-progress state
- `grill-me` / `grill-with-docs` — for the next backlog item, or to keep
  sharpening an existing plan before `spec-plan`
- `terse-commit` — before any `git commit`, no exceptions
- `capture` — to log new out-of-scope issues noticed mid-task
- `handoff` — to refresh this document at the next session boundary
