# Low Balance Warning — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `docs/specs/RULEBOOK.md`.
Integration branch: `develop`. Branch model: stacked (default; single phase, so moot).

## STATUS

- Current phase: 1 — in-progress
- Phase 1 — Underfunded account warning: in-progress
- Verification debt: none (local gate passed; CI gate open until the phase PR runs)

## Phase 1 — Underfunded account warning

Branch: `low-balance-warning/phase-1-underfunded-banner` (off `develop`)

Single phase: web-only, no API/schema/migration, so there is no dependency layer to split on.

Consumes: `useAccounts()` (`features/accounts/queries.ts:25`, Accounts carry server-computed
`balance`), `useSubscriptions()` (`features/subscriptions/queries.ts:13`), existing
`daysUntilDue` (`features/subscriptions/helpers.ts`).
Produces: nothing — no later phase.

- [x] Add `underfundedAccounts(accounts, subscriptions, today)` to
  `packages/web/src/features/subscriptions/helpers.ts`, beside `isDue`/`isDueSoon`,
  returning `{ account, shortfall }[]` per PLAN.md → "The Rule". Export the 30-day horizon
  as a named constant; do not inline the literal.
- [x] Cover the rule in `packages/web/src/features/subscriptions/helpers.test.ts`: card
  exclusion, inactive Subscriptions, yearly outside vs inside horizon, overdue-unlogged
  inclusion, multiple Subscriptions summing on one Account, at-threshold boundary.
- [x] Add banner strings to both `VI` and `EN` in `packages/web/src/core/i18n.tsx`
  (`TranslationKey` is inferred from `VI`, so both objects must stay in parity).
- [x] Create `packages/web/src/features/subscriptions/components/LowBalanceBanner.tsx`:
  reads the two hooks, names each underfunded Account and its shortfall via `formatVND`,
  hand-rolled markup against `SubscriptionDueBanner.tsx`'s existing classes, **no dismiss
  control**, renders `null` when empty.
- [x] Add `LowBalanceBanner.test.tsx`: renders for an underfunded Account, renders nothing
  when funded, exposes no dismiss control.
- [x] Mount it above `SubscriptionDueBanner` in `packages/web/src/routing/app-pages.tsx` and
  `packages/web/src/features/subscriptions/components/DesktopSubscriptions.tsx`. Share no
  state between the two banners.
- [x] Add **Underfunded** and **Funding horizon** to `CONTEXT.md` (glossary only — no schema,
  no file references). Keep _Funding horizon_ distinct from the existing seven-day
  _Due soon_.

**Agent gate (hard):**
- [x] `pnpm typecheck` — project-wide, not scoped; catches `TranslationKey` parity breakage
  across packages.
- [x] `pnpm test` — full local suite, not `vitest related`. This phase edits
  `helpers.ts` and `i18n.tsx`, both shared surfaces whose consumers the import graph
  understates. Matches what CI runs (`.github/workflows/ci.yml:31`).
- [ ] CI green on the phase PR
- Build gate skipped: no config, entry-point, or codegen changes; typecheck covers this diff.

**Review checklist (user, at PR review):**
- [ ] With Itel at 14.102 ₫ and a 79.000 ₫ charge due next month, the banner appears on
  mobile home and desktop dashboard naming Itel and a 64.898 ₫ shortfall.
- [ ] After a Transfer topping Itel above the horizon sum, the banner disappears.
- [ ] The banner offers no dismiss control and survives navigating away and back.
- [ ] When the Subscription is also due, the low-balance banner sits above the due banner.
- [ ] "Log now" on the due banner still works while Itel is underfunded.
- [ ] A `card` Account with Subscriptions and a low balance produces no banner.
- [ ] Both banners read correctly in `vi` and `en` with no raw key visible.

**On completion:** run local agent gate, update STATUS + checkboxes, rerun `pnpm specs:index`
and commit the regenerated INDEX.md in the same commit, stop and ask before push/PR; after
the PR opens, watch CI and fix red before marking the phase done. Review checklist goes into
the PR description.

**Note:** CLAUDE.md requires the `react-frontend-developer` skill for frontend code
generation — invoke it when writing the banner component.
