# PWA — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

**Base branch note:** Phase 1 bases off `develop`, not `main` — this session established
`develop` as the integration branch (features land there; `main` only merges once mature
enough). If that workflow changes before this spec starts, rebase Phase 1 accordingly and
drop this note.

All phases after Phase 1 stack sequentially on each other (`phase-2` off `phase-1`), per the
normal rule. Do not start a phase's PR/push without explicit confirmation even if the
phase's commits are already authorized.

---

## Phase 1 — Installable Icons + Manifest + Favicon

Branch: `pwa/phase-1-installable-icons` (off `develop`)

Everything needed to make the app actually pass Chrome's installability check and show a
real tab icon. Frontend-only, `packages/web`.

- [ ] Add `@vite-pwa/assets-generator` as a dev dependency in `packages/web`
- [ ] New fixed-color source SVG (e.g. `packages/web/src/assets/app-icon.svg`): deep-ink
      background (hex equivalent of `oklch(0.18 0.012 80)`), mark in Register Gold (hex
      equivalent of `oklch(0.60 0.15 78)`), same mark geometry as `public/icon.svg` — copy
      the `<path>` data, drop the `prefers-color-scheme` media-query styling, hardcode the
      two fills instead
- [ ] `packages/web/vite.config.ts`: configure `VitePWA({ ..., pwaAssets: { image:
      'src/assets/app-icon.svg' } })` using the generator's minimal-recommended preset
      (192/512/maskable/apple-touch/favicon per PLAN.md's Open Items — follow the tool's
      documented default rather than hand-picking sizes)
- [ ] `packages/web/vite.config.ts`: convert manifest `theme_color`/`background_color` from
      `oklch(0.985 0.004 90)` to the equivalent hex value
- [ ] `packages/web/index.html`: add `<link rel="icon" href="/icon.svg"
      type="image/svg+xml">` referencing the existing adaptive favicon (not the new
      generator output — `icon.svg`'s light/dark media-query behavior stays as-is for the
      live tab favicon); add any additional `<link>` tags the `pwaAssets` generator's Vite
      integration injects automatically for apple-touch-icon (verify via build output
      whether manual addition is even needed)
- [ ] Confirm `manifest.webmanifest`'s generated `icons` array is non-empty and includes at
      least one `purpose: "maskable"` entry (build and inspect `dist/manifest.webmanifest`
      directly, per this session's earlier survey approach)

**Verification gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck` passes
- [ ] `pnpm --filter @wallet/web test` passes (no existing tests should be affected, but run
      the suite to confirm no PWA-plugin build-time changes broke anything)
- [ ] `pnpm --filter @wallet/web build` succeeds; inspect `dist/manifest.webmanifest` — icons
      array populated (192, 512, maskable present), `theme_color`/`background_color` are hex
      not oklch; inspect `dist/index.html` — favicon `<link>` present
- [ ] Manual check: serve `dist/` (`pnpm --filter @wallet/web preview`), open in Chrome
      DevTools → Application → Manifest panel — confirm no installability warnings/errors
      listed, icons render correctly in the panel's preview. Also check the browser tab
      shows the favicon (not blank)

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 2 — Offline Messaging

Branch: `pwa/phase-2-offline-messaging` (off `phase-1`)

Graceful offline state for reads/writes — no queue, no retry-on-reconnect, per PLAN.md's
explicit scope limit.

- [ ] Offline detection mechanism (implementation choice per PLAN.md's Open Items:
      `navigator.onLine` + `window` `online`/`offline` event listeners, or inferring from
      fetch failures in `packages/web/src/core/api.ts`'s `apiFetch` — pick whichever is
      simpler once started, document the choice in this checklist item when checked off)
- [ ] Distinct "you're offline" messaging surfaced when a fetch fails specifically due to
      being offline, as opposed to a genuine API/server error — exact UI treatment (banner,
      toast, inline state) is an implementation choice; if the `error-handling` spec's
      `sonner`/`MutationCache.onError` infra has landed by this point, prefer reusing it
      for consistency rather than building a second notification path
- [ ] No write-queue, no auto-retry-on-reconnect — writes attempted while offline fail with
      the same offline messaging as reads, nothing gets queued (explicit non-goal per
      PLAN.md)

**Verification gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck` passes
- [ ] `pnpm --filter @wallet/web test` passes; add test coverage for the offline-detection
      logic itself (mock `navigator.onLine` / dispatch offline event, or mock a fetch
      rejection depending on which mechanism was chosen)
- [ ] Manual check: in Chrome DevTools → Network tab, set throttling to "Offline", attempt a
      read (load a screen that fetches) and a write (submit a form) — confirm both surface
      the offline-specific message rather than a generic error, and that going back online
      and retrying manually succeeds normally

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete both phase branches.
