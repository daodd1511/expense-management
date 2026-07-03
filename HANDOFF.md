# Handoff — pwa Spec Complete (Both Phases), error-handling Not Started

## Context

- Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
- Branch: `pwa/phase-2-offline-messaging` (off `pwa/phase-1-installable-icons`, off `develop`)
- `main` and `develop`: `category-redesign` (3 phases) and `category-ux` (4 phases) are both
  fully merged to `main` via GitHub PRs. `develop` was created this session off `main`'s
  current tip — feature work lands on `develop` first; `main` only merges once features on
  `develop` are mature. `develop` is not pushed yet (user will push manually).
- **New workflow rule this session, added to `CLAUDE.md`** (own commit, `pwa/phase-2-
  offline-messaging`'s first commit — not yet on `develop`): one spec in flight at a time.
  A prior attempt to start `error-handling` Phase 1 mid-session while `pwa` still had an
  unfinished phase was explicitly corrected by the user — that in-progress work was stashed
  and the branch deleted, `pwa` was finished first. Do not start or resume a different
  spec's phase while another spec has an unfinished phase; finish (commit + gate + docs
  updated) or get explicit sign-off to park it first.
- Also on `main`/`develop` but **uncommitted in the working tree as of last check**: a
  Bun→Node runtime migration for `packages/api` (esbuild bundle + `@hono/node-server`
  instead of Bun's native server, CI re-enabled typecheck/test, `node-version: 22`). Was
  reviewed this session — one confirmed bug: `packages/api/package.json`'s `dev` script
  (`pnpm build && node --watch dist/index.js`) watches the bundled output, not source, so
  local dev edits don't trigger a reload. Not fixed yet, not blocking either spec below.

## Spec 1: `error-handling` — Planned, Not Started

`specs/error-handling/PLAN.md` + `specs/error-handling/EXECUTION.md` exist, produced via
`/grill-me` → `spec-plan`. **No branch exists.** A branch was briefly created and worked
mid-session (BE `mapDbError` helper + route-file conversions) but was stopped, stashed, and
the branch deleted per the user's "finish pwa first" instruction — see stash below.

3 phases, stacked: `error-handling/phase-1-be-error-mapping` (base off `develop`, not `main`
— `EXECUTION.md`'s base-branch note predates `develop`'s creation, same fix already applied
to `pwa`, apply it here too when starting) → `phase-2-fe-error-infra` →
`phase-3-fe-forms-inline-errors`.

Summary: BE collapses all Postgres errors to raw-message 500s (add `mapDbError` inspecting
`error.code`, global `app.onError`, centralized `console.error` logging). FE has zero error
handling anywhere — 19 fire-and-forget `.mutate()` calls, no toast, no error boundary. Fix:
`sonner` for toasts (global `MutationCache.onError`), custom `ApiError` class carrying HTTP
status, `store.tsx` callbacks become async, all 5 forms get inline-banner-on-failure with
retained input. Full detail in `PLAN.md`'s Decisions table.

**There is a `git stash` entry** (message: "error-handling phase 1: mapDbError + route
conversions, in-progress") containing a working draft of Phase 1's `mapDbError` helper
(`packages/api/src/lib/http.ts`) and its application across all 6 route files via sed —
`categories.ts`'s `loadParentCandidate` helper still needed a fix (it discards the Postgres
error code, returning only `.message`, so its two call sites couldn't route through
`mapDbError` yet) when work stopped. Check `git stash list` before restarting Phase 1 — the
draft may still be usable as a starting point, but verify it against current `develop` state
first since time has passed.

**Not started — next action is `spec-phase error-handling` when picked up.**

## Spec 2: `pwa` — Complete (Both Phases), Not Pushed

`specs/pwa/PLAN.md` + `specs/pwa/EXECUTION.md` exist, produced via `/grill-me` →
`spec-plan`, executed via `spec-phase` across two branches, both done.

### Phase 1 — Installable Icons + Manifest + Favicon: done

Branch: `pwa/phase-1-installable-icons` (off `develop`), 2 commits.

- `@vite-pwa/assets-generator` generates the manifest icon set (192/512/maskable/apple-
  touch/favicon.ico) from a new `packages/web/public/app-icon.svg` — fixed gold-on-ink
  design (`#b07200` on `#14110c`, computed from DESIGN.md's Register Gold/deep-ink OKLCH
  values), distinct from the existing `public/icon.svg` (kept as the live tab favicon,
  since it still responds to `prefers-color-scheme` — a static install icon can't).
- Manifest `theme_color`/`background_color` converted from `oklch(0.985 0.004 90)` to
  `#fbfaf7` — manifest parsers have less consistent CSS Color 4 support than page CSS.
- `pwaAssets.includeHtmlHeadLinks`/`injectThemeColor` set to `false`, head links added
  manually in `index.html` instead — the plugin's auto-injected favicon `<link>` points at
  the fixed-color install icon, not the adaptive one.

**Real gotcha, worth knowing if touching this area again:** the source image for
`pwaAssets` must live inside `public/`, not `src/assets/` — the generator writes output
*next to the source image*, and only files in `public/` get copied into `dist/` by Vite's
normal static-asset handling. `src/assets/` output silently never ships — manifest
references it by root path but `dist/` never has the file, no error thrown.

Verification: `tsc` clean, FE suite 26/26, `pnpm build` succeeds, manifest/HTML inspected
directly. Chrome DevTools → Application → Manifest panel check **not run** — no browser
automation tool available. Substituted with `curl`-verified asset resolution.

### Phase 2 — Offline Messaging: done

Branch: `pwa/phase-2-offline-messaging` (off `phase-1`), 3 commits (one of which is the
`CLAUDE.md` workflow-rule change, unrelated to `pwa` itself — see Context above).

- `packages/web/src/core/useOnlineStatus.ts` — `navigator.onLine` +
  `window` `online`/`offline` event-listener hook.
- `packages/web/src/shared/components/OfflineBanner.tsx` — fixed, non-dismissible
  top-of-viewport banner shown whenever offline, mounted app-wide in `main.tsx` (inside
  `LangProvider`, above `AuthGate`). New i18n key `offline.banner`, VI + EN.
- Deliberately **not** built on `sonner`/`MutationCache.onError` (that infra doesn't exist
  yet, `error-handling` hasn't landed) — a single global banner covers both reads and
  writes uniformly with no per-mutation wiring, resolving the soft-coupling the plan
  originally flagged. No rework expected once `error-handling` lands; its toasts would
  layer on top for per-action feedback, not replace this banner.
- No write-queue, no auto-retry-on-reconnect — confirmed no queuing logic was added
  anywhere, per PLAN.md's explicit non-goal.

Verification: `tsc` clean, FE suite 29/29 (26 prior + 3 new `OfflineBanner.test.tsx` cases).
`pnpm build` succeeds. Chrome DevTools throttle-to-offline manual check **not run** — same
browser-automation gap as Phase 1; unit tests cover the `navigator.onLine`/event-listener
logic but not the real end-to-end `fetch`-fails-while-offline path or the banner's visual
layout in the actual app.

**Both phases done. Nothing pushed yet** — user pushes manually.

## Remaining Work

1. Ask before starting `error-handling` — needs fresh explicit go-ahead; check
   `git stash list` first per the note above.
2. Push `pwa/phase-1-installable-icons` and `pwa/phase-2-offline-messaging` — not done,
   user pushes manually.
3. `develop` itself isn't pushed to `origin` yet either.
4. `CLAUDE.md`'s new one-spec-at-a-time rule is only committed on `pwa/phase-2-offline-
   messaging` — consider whether it should land on `develop` directly instead/also, since
   it's a workflow rule, not `pwa` feature scope.
5. Bun→Node migration's broken dev-watch script (`packages/api/package.json`) — flagged,
   not fixed, not blocking.
6. `gh` account mismatch still blocks PR creation from this environment (`daoduong-saritasa`
   can't see `daodd1511/expense-management`) — unresolved.
7. GitHub default-branch flip to `develop` — requires the correct `gh` account or the
   GitHub web UI; not doable from here.
8. Real browser verification owed for both `pwa` phases (installability panel, offline
   throttle test) — no browser automation tool available all session.
