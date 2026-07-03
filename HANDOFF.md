# Handoff — pwa Phase 1 Complete, error-handling Not Started

## Context

- Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
- Branch: `pwa/phase-1-installable-icons` (off `develop`)
- `main` and `develop`: `category-redesign` (3 phases) and `category-ux` (4 phases) are both
  fully merged to `main` via GitHub PRs (see `git log` merge commits). A `develop` branch
  was created this session off `main`'s current tip — going forward, feature work lands on
  `develop` first; `main` only merges once features on `develop` are mature. `develop` is
  not pushed yet (user will push manually).
- Also on `main`/`develop` but **uncommitted in the working tree as of last check**: a
  Bun→Node runtime migration for `packages/api` (esbuild bundle + `@hono/node-server`
  instead of Bun's native server, CI re-enabled typecheck/test, `node-version: 22`). Was
  reviewed this session — one confirmed bug: `packages/api/package.json`'s `dev` script
  (`pnpm build && node --watch dist/index.js`) watches the bundled output, not source, so
  local dev edits don't trigger a reload. Not fixed yet, not blocking either spec below.

Two specs are in flight, independent of each other except one soft coupling noted below:

## Spec 1: `error-handling` — Planned, Not Started

`specs/error-handling/PLAN.md` + `specs/error-handling/EXECUTION.md` exist, both produced
via `/grill-me` → `spec-plan` this session. **No branch created yet, no code written.**

3 phases, stacked: `error-handling/phase-1-be-error-mapping` (off `main`) →
`phase-2-fe-error-infra` → `phase-3-fe-forms-inline-errors`.

Summary: BE collapses all Postgres errors to raw-message 500s (add `mapDbError` inspecting
`error.code`, global `app.onError`, centralized `console.error` logging). FE has zero error
handling anywhere — 19 fire-and-forget `.mutate()` calls, no toast, no error boundary. Fix:
`sonner` for toasts (global `MutationCache.onError`), custom `ApiError` class carrying HTTP
status, `store.tsx` callbacks become async, all 5 forms get inline-banner-on-failure with
retained input. Full detail in `PLAN.md`'s Decisions table — read that before starting, not
this summary.

**Not started — next action is `spec-phase error-handling` when picked up.**

## Spec 2: `pwa` — Phase 1 of 2 Complete

`specs/pwa/PLAN.md` + `specs/pwa/EXECUTION.md` exist, also produced via `/grill-me` →
`spec-plan` this session, executed via `spec-phase` immediately after.

### Phase 1 — Installable Icons + Manifest + Favicon: done, committed, not pushed

Branch: `pwa/phase-1-installable-icons` (off `develop`), 2 commits.

What changed:
- `@vite-pwa/assets-generator` generates the manifest icon set (192/512/maskable/apple-
  touch/favicon.ico) from a new `packages/web/public/app-icon.svg` — fixed gold-on-ink
  design (`#b07200` on `#14110c`, computed from DESIGN.md's Register Gold/deep-ink OKLCH
  values), distinct from the existing `public/icon.svg` (kept as the live tab favicon,
  since it still responds to `prefers-color-scheme` — a static install icon can't).
- Manifest `theme_color`/`background_color` converted from `oklch(0.985 0.004 90)` to
  `#fbfaf7` — manifest parsers have less consistent CSS Color 4 support than page CSS.
- `packages/web/vite.config.ts`'s `pwaAssets.includeHtmlHeadLinks`/`injectThemeColor` set
  to `false`, head links added manually in `index.html` instead — needed because the
  plugin's auto-injected favicon `<link>` points at the fixed-color install icon, not the
  adaptive one; would have silently overridden the correct favicon otherwise.

**Real gotcha hit and fixed, worth knowing if touching this area again:** the source image
for `pwaAssets` must live inside `public/`, not `src/assets/` — the generator writes output
*next to the source image*, and only files in `public/` get copied into `dist/` by Vite's
normal static-asset handling. Putting the source in `src/assets/` produces icons that exist
on disk but never ship — manifest references them by root path (`/pwa-192x192.png`) but
`dist/` never has them. No error is thrown; this fails silently and only shows up if you
actually inspect `dist/` contents (which is why the phase's DevTools-panel manual check
matters, though it wasn't run — see below).

Verification: `tsc` clean, FE suite 26/26, `pnpm build` succeeds, `dist/manifest.webmanifest`
inspected directly (icons array populated correctly), `dist/index.html` inspected (favicon/
apple-touch-icon/manifest links all correct, no duplicate `theme-color`). Chrome DevTools →
Application → Manifest panel check **not run** — no browser automation tool available this
session (consistent gap across every UI phase, both this session's specs and prior ones).
Substituted: served `dist/` via `pnpm preview`, `curl`-verified every referenced asset
resolves with 200. This covers "the files exist and are correctly typed/sized" but not
Chrome's own installability-heuristic verdict — worth a real browser check before assuming
this is installable in practice.

### Phase 2 — Offline Messaging: not started

Offline detection + "you're offline" messaging (no write queue, no auto-retry — explicit
non-goal). **Soft dependency on `error-handling` Phase 2**: PLAN.md says to prefer reusing
`sonner`/`MutationCache.onError` for the offline message if that infra has landed by the
time this starts, rather than building a second notification path. Both specs also touch
`packages/web/src/core/api.ts` and possibly `main.tsx` — expect a merge conflict between
`pwa` Phase 2 and `error-handling` Phase 2/3 regardless of which lands first; sequencing
`error-handling` first avoids redoing the offline-toast wiring once `sonner` exists.

**Not started.**

## Remaining Work

1. Ask before starting `pwa` Phase 2 or `error-handling` — both need fresh explicit
   go-ahead per the spec-phase rules, current phase's gate already passed but that doesn't
   auto-authorize the next one.
2. Push `pwa/phase-1-installable-icons` — not done yet, user said they'll push manually.
3. `develop` itself isn't pushed to `origin` yet either.
4. Bun→Node migration's broken dev-watch script (`packages/api/package.json`) — flagged,
   not fixed, not blocking.
5. `gh` account mismatch still blocks PR creation from this environment (`daoduong-saritasa`
   can't see `daodd1511/expense-management`) — same as prior sessions, unresolved.
6. GitHub default-branch flip to `develop` — user wants this but it requires either the
   correct `gh` account or the GitHub web UI; not doable from here.
