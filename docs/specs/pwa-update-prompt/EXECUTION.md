# PWA Update Prompt + Version Display — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: All phases complete
- Phase 1 — Version display + build stamping: done
- Phase 2 — Prompt-mode update flow: done
- Verification debt: none

## Phase 1 — Version display + build stamping

Branch: `pwa-update-prompt/phase-1-version-display` (off `develop`)

Purely additive/informational: surface which build is running, with build-time commit metadata.
Touches no update behavior (still `autoUpdate` after this phase), so it's independently
verifiable and revertable. Phase 2's interactive Update control attaches to the version row
this phase builds.

- [x] `packages/web/vite.config.ts` — add `define` for `__APP_COMMIT__` and `__APP_COMMIT_DATE__`,
      read via `execSync('git rev-parse --short HEAD')` / `git log -1 --format=%cd --date=short`
      in a `try/catch` with a `'dev'` fallback; prefer `process.env.APP_COMMIT` / `APP_COMMIT_DATE`
      when set (CI override). Judgment call left to impl: expose as `define` globals + ambient d.ts
      vs. route through `import.meta.env` — either is fine, pick one and stay consistent.
- [x] Ambient type declaration for the two `__APP_*__` globals (e.g. add to
      `packages/web/src/vite-env.d.ts`) — only if the `define`-globals route is chosen.
- [x] Semver source: read `0.1.0` from `packages/web/package.json` (JSON import or `define`) — do
      not hardcode a second copy of the number.
- [x] New shared component `AppVersionRow` (in `packages/web/src/features/settings/components/`)
      rendering `0.1.0 · <shortSHA> · <commit-date>`. Update affordance is added in Phase 2 — this
      phase renders the static string only.
- [x] Wire `AppVersionRow` into `packages/web/src/features/settings/components/Settings.tsx` and
      `MobileSettings.tsx`.
- [x] i18n: add VI + EN keys for the version row label in `packages/web/src/core/i18n.tsx`
      (both `VI` and `EN` objects — parity enforced by `TranslationKey`).
- [x] `.github/workflows/deploy.yml` — in the "Build Web" step, export `APP_COMMIT`
      (`git rev-parse --short HEAD`) and `APP_COMMIT_DATE` (`git log -1 --format=%cd --date=short`)
      into env so the Vite `define` picks them up. (Local git read in `vite.config.ts` covers
      non-CI builds; CI's shallow clone still has `HEAD`, so both git commands work.)

**Agent gate (hard):**
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build` (exercises the `define` git read + version row render path)

**Review checklist (user, at PR review):**
- [ ] Settings shows `0.1.0 · <sha> · <date>` on both desktop and mobile layouts.
- [ ] `pnpm dev` renders the `dev` fallback without crashing (no git env in the define path).
- [ ] After a real deploy, the SHA/date in Settings match the deployed commit.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR.
Review checklist goes into the PR description.

## Phase 2 — Prompt-mode update flow

Branch: `pwa-update-prompt/phase-2-update-prompt` (off `pwa-update-prompt/phase-1-version-display`,
stacked)

Switches update behavior and builds the apply mechanism. Depends on Phase 1: the inline "Update"
control attaches to the `AppVersionRow` component. Prompt-mode switch and the apply mechanism
(provider + toast + Settings control) must land together — switching to `prompt` without them
would leave the waiting worker never activating.

- [x] `packages/web/vite.config.ts` — change `registerType: 'autoUpdate'` → `'prompt'`; set
      `injectRegister` so the worker registers exactly once via the app hook (not also via an
      auto-injected `registerSW.js`). Judgment call left to impl: exact `injectRegister` value —
      verify only one registration happens.
- [x] New `PwaUpdateProvider` (`packages/web/src/core/PwaUpdateProvider.tsx`) — calls
      `useRegisterSW()` from `virtual:pwa-register/react` once; in `onRegisteredSW`, run
      waiting-at-startup logic (if `registration.waiting` exists at launch → show one sticky
      `sonner` toast with an "Update" action → `updateServiceWorker(true)`). Expose
      `{ needRefresh, updateServiceWorker }` via React context. Mid-session `needRefresh` → no
      toast (context only).
- [x] `packages/web/src/main.tsx` — mount `PwaUpdateProvider` around the tree (Toaster already
      present).
- [x] Extend `AppVersionRow` — when `needRefresh` is true, show an inline "Update" button →
      `updateServiceWorker(true)`; otherwise version string only.
- [x] i18n: add VI + EN keys for toast title/body/action and the "Update" button in
      `packages/web/src/core/i18n.tsx` (both objects).
- [x] Leave `packages/web/src/core/swUpdate.ts` unchanged — it still drives foreground detection
      that feeds `needRefresh`; confirm it's not double-registering against the provider.

**Agent gate (hard):**
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`

**Review checklist (user, at PR review — requires a real deploy + device/browser, not
agent-runnable):**
- [ ] Deploy build B while build A is open and foregrounded → page does **not** auto-reload;
      Settings gains an "Update" control; no toast mid-session.
- [ ] Cold-open with a pending (waiting) update → toast appears once; tapping Update reloads to
      build B; Settings SHA changes to B's.
- [ ] Update detected mid-session → no toast, only the Settings control lights up.
- [ ] Tapping the Settings Update control activates the waiting worker and reloads; post-reload
      SHA matches the deployed build.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before push/PR.
Review checklist goes into the PR description.
