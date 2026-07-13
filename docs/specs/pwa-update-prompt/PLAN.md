# PWA Update Prompt + Version Display — Plan

Produced via `/grill-with-docs` interview. All decisions below were explicitly confirmed;
do not reinterpret or expand scope without re-confirming.

## Problem

The app ships as an installable PWA with `registerType: 'autoUpdate'` (`packages/web/vite.config.ts`).
That mode silently `skipWaiting()`s and reloads the page the moment a new service worker
installs. Two consequences drove this spec:

- **Silent reload eats in-progress work.** The app is full of bottom-sheet/drawer forms; an
  auto-reload mid-entry discards half-typed transaction data with no warning.
- **No way to know which build you're running.** `package.json` version is a static `0.1.0`,
  never bumped, and nothing surfaces it. When "did my deploy actually land on the phone?"
  came up, the only recourse was `curl -sI …/sw.js` and eyeballing bundle hashes.

The original PWA spec (`docs/specs/pwa/PLAN.md` → Decisions → "Update UX") deliberately deferred
this: *"Keep silent `autoUpdate` … can revisit once `sonner` lands."* `sonner` has landed
(`main.tsx` renders `<Toaster>`), so this spec is that revisit and **supersedes** that decision.

## Goals

- Updates never interrupt or destroy active use. The disruptive reload happens only when the
  user chooses it.
- Applying an update is always available via a non-intrusive control in Settings.
- A gentle nudge appears **only** when the user has just opened the app and a downloaded update
  is already pending — not mid-session.
- Settings always shows which build is currently running (semver · commit SHA · commit date),
  so "did it update?" is answerable at a glance after a reload.
- The apply mechanism is decoupled from the version string, so introducing real semver later
  changes nothing about how updates are detected or applied.

## Non-Goals

- **No auto-incrementing version on deploy.** Explicitly dropped: neither CI-owned semver bumps
  (commit-back → re-triggers `on: push` deploy loop, needs a write token) nor a git-derived build
  number this round. Version is static semver + build-time SHA/date only.
- **No "Check for updates" button.** Detection already runs on foreground (`swUpdate.ts` →
  `registration.update()`) and ~every 24h; a manual poke is redundant for a single-user app.
- **No `onOfflineReady` toast.** Non-actionable one-time notice; cuts against the quiet-ledger feel.
- No offline write queue, no changes to the SW's precache/offline behavior (out of scope, owned
  by `docs/specs/pwa`).

## How update detection actually works (shared understanding)

The browser re-fetches `sw.js` and **byte-compares** it against the installed worker. `sw.js`
embeds the precache manifest with content-hashed asset names
(`assets/index-<hash>.js`), so any real code change flips a hash → `sw.js` body differs → a new
worker installs, precaches, and enters the **`waiting`** state. `Last-Modified`/`ETag` are
irrelevant to detection — only the body matters. (Confirmed empirically: an empty commit left
`sw.js` byte-identical → no update; a real text change flipped `J3UL6L2A`→`iSymMAXr` → update
fired.)

Detection ≠ application. In `prompt` mode the new worker sits in `waiting`; the page keeps
running the **old** in-memory code until a reload activates the waiting worker
(`skipWaiting` + `clientsClaim`) and reloads. Applying = that reload. Everything below is about
**who triggers the reload and when**.

## Product Decisions

| Decision | Choice | Reason |
|---|---|---|
| Update mode | Switch `registerType: 'autoUpdate'` → **`'prompt'`** | Stops the silent auto-reload that eats form data; puts reload timing under user control. Reversible config flag, so not ADR-worthy. |
| Apply affordance | **"Update" control in Settings**, bound to reactive `needRefresh`; tap → `updateServiceWorker(true)` | Non-disruptive: sits idle until the user navigates to Settings. Works whether the update was detected at open or mid-session. |
| Toast trigger | **Waiting-at-startup only** — on launch, if `registration.waiting` already exists (update downloaded in a prior session, never applied), show one toast. Updates that become ready *during* a live session → **no toast**, only the Settings control lights up. | Deterministic, no magic timeout. Matches "you just opened it and there's a pending update" while never interrupting active work. |
| Toast behavior | Sticky (no auto-dismiss), single "Update" action → `updateServiceWorker(true)`; dismissible. Dismissing leaves the Settings control as the fallback. | The toast is a convenience nudge, not the source of truth; the Settings control always remains. |
| Version display | Always-visible Settings row: **`0.1.0 · <shortSHA> · <commit-date>`**. Update affordance appears inline next to it only when `needRefresh` is true. | The version row is the standing "which build am I on"; the Update control is contextual. Decoupled from semver so future real versioning drops in cleanly. |
| Version source | Static semver from `package.json`; short SHA + commit date injected at build via Vite `define`, `dev` fallback when git/env absent | No auto-increment, no commit-back. SHA+date change every deploy → the real "did it update" signal. `git rev-parse --short HEAD` / `git log -1 --format=%cd` work under CI's shallow clone (need only HEAD). |
| Offline-ready notice | None | Non-actionable, once-only, against the quiet feel. |
| Manual check button | None | Redundant with foreground + 24h auto checks for a single user. |

## Judgment Calls (not asked, noted here)

- **Shared registration via a `PwaUpdateProvider`.** Both the toast and the Settings control need
  the same `needRefresh` flag + `updateServiceWorker` fn from `virtual:pwa-register/react`'s
  `useRegisterSW()`. Calling the hook twice would double-register. So: one provider near the root
  (in `main.tsx`, wrapping the tree) calls `useRegisterSW` once, runs the waiting-at-startup toast
  logic in `onRegisteredSW`, and exposes `{ needRefresh, updateServiceWorker }` via context for
  Settings to consume.
- **Registration ownership.** Using `useRegisterSW` means the app owns registration; ensure
  `vite-plugin-pwa`'s auto-injected `registerSW.js` doesn't *also* register (set `injectRegister`
  accordingly) so the worker registers exactly once.
- **Keep `swUpdate.ts` foreground check.** `registerForegroundSWUpdateCheck()` still drives
  detection on foreground; unchanged. It feeds `needRefresh`, which now surfaces via the Settings
  control instead of an auto-reload.
- **Commit date = `HEAD` commit date, not build wall-clock** (`git log -1 --format=%cd --date=short`)
  — "when the deployed code was last changed" is the honest signal.
- **Shared version/update row component.** Both `Settings.tsx` and `MobileSettings.tsx` render it;
  extract one small component rather than duplicating.

## Scope of Work

Frontend + build config only (`packages/web`), plus one CI tweak. No API, no shared, no DB.

1. **`vite.config.ts`**
   - `registerType: 'autoUpdate'` → `'prompt'`.
   - Set `injectRegister` so registration happens once via the app hook (resolve exact value at
     implementation time).
   - Add `define` for `__APP_COMMIT__` and `__APP_COMMIT_DATE__`, read from git via `execSync` in a
     `try/catch` with a `'dev'` fallback; overridable by CI-provided env vars.
   - Add a TS ambient declaration for the two `__APP_*__` globals (or expose via `import.meta.env`).
2. **`PwaUpdateProvider`** (new, `packages/web/src/core/` or `shared/`)
   - Calls `useRegisterSW()` once; runs waiting-at-startup toast logic in `onRegisteredSW`
     (check `registration.waiting`); shows the sticky `sonner` toast with an Update action.
   - Exposes `{ needRefresh, updateServiceWorker }` via context.
   - Mounted in `main.tsx` around the tree (Toaster already present).
3. **Version + update row** (new shared component)
   - Renders `0.1.0 · <SHA> · <date>`; when `needRefresh`, shows inline "Update" button →
     `updateServiceWorker(true)`.
   - Consumed by `features/settings/components/Settings.tsx` and `MobileSettings.tsx`.
4. **i18n** — add VI + EN keys for: toast title/body/action, Settings version label, "Update"
   action, and (optional) "Up to date" idle text. Both `VI` and `EN` objects.
5. **`.github/workflows/deploy.yml`** — export `APP_COMMIT` / `APP_COMMIT_DATE` (from
   `git rev-parse --short HEAD` / `git log -1`) into the Build Web step's env, consumed by the
   Vite `define` fallback. (Local git read in `vite.config.ts` also covers non-CI builds.)
6. **Supersede note** — update `docs/specs/pwa/PLAN.md` "Update UX" decision to point here.

## Verification

- **Typecheck / test / build** green (`pnpm typecheck`, `pnpm test`, `pnpm build`).
- **Version renders**: Settings shows `0.1.0 · <sha> · <date>` on both mobile and desktop; `pnpm dev`
  shows the `dev` fallback without crashing.
- **Prompt mode, no silent reload**: deploy build B while build A is open and foregrounded → the page
  does **not** auto-reload; the Settings row gains an "Update" control; no toast appears mid-session.
- **Waiting-at-startup toast**: with an update already downloaded/pending, cold-open the app → the
  toast appears once; tapping Update reloads to the new build; the Settings SHA changes to build B's.
- **Toast suppression mid-session**: update detected during active use → no toast, only the Settings
  control.
- **Apply from Settings**: tapping the Settings Update control activates the waiting worker and
  reloads; post-reload SHA matches the deployed build.

## Explicitly Out of Scope

- Auto-incrementing / CI-owned version numbers (see Non-Goals).
- "Check for updates" button; `onOfflineReady` toast.
- Any change to precache strategy, offline messaging, or the offline write-queue question.
