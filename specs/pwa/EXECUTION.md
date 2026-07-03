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

- [x] Add `@vite-pwa/assets-generator` as a dev dependency in `packages/web`
- [x] New fixed-color source SVG `packages/web/public/app-icon.svg` (moved to `public/`, not
      `src/assets/` — the generator writes output next to the source image, and expects it
      inside `public/` so generated PNGs get copied into `dist/` by Vite's normal static
      handling; `src/assets/` output was silently orphaned, discovered and fixed during this
      phase): deep-ink background (`#14110c`, computed from `oklch(0.18 0.012 80)`), mark in
      Register Gold (`#b07200`, computed from `oklch(0.60 0.15 78)`), same mark geometry as
      `public/icon.svg` — path data copied, `prefers-color-scheme` media-query styling
      dropped, two fills hardcoded instead
- [x] `packages/web/vite.config.ts`: `VitePWA({ ..., pwaAssets: { image: 'public/app-icon.svg',
      includeHtmlHeadLinks: false, injectThemeColor: false } })` using the generator's
      default `minimal-2023` preset (192/512/maskable/apple-touch/favicon.ico — matches
      PLAN.md's Open Items note to use the documented default). `includeHtmlHeadLinks`/
      `injectThemeColor` disabled because the plugin's auto-injected favicon `<link>` points
      at the fixed-color `app-icon.svg`, not the adaptive `icon.svg` — head links are added
      manually instead (next item) to keep the two icon sources correctly separated
- [x] `packages/web/vite.config.ts`: converted manifest `theme_color`/`background_color` from
      `oklch(0.985 0.004 90)` to `#fbfaf7` (computed hex equivalent)
- [x] `packages/web/index.html`: added `<meta name="theme-color" content="#fbfaf7">`,
      `<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="icon"
      href="/icon.svg" sizes="any" type="image/svg+xml">` (existing adaptive favicon,
      light/dark media-query behavior preserved), `<link rel="apple-touch-icon"
      href="/apple-touch-icon-180x180.png">`
- [x] Confirmed `dist/manifest.webmanifest`'s `icons` array is non-empty: `pwa-64x64.png`,
      `pwa-192x192.png`, `pwa-512x512.png`, and `maskable-icon-512x512.png` with
      `"purpose":"maskable"` — verified by building and reading the file directly

**Verification gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` passes
- [x] `pnpm --filter @wallet/web test` passes — 26/26, unaffected (no PWA-plugin build-time
      change touches app code)
- [x] `pnpm --filter @wallet/web build` succeeds; `dist/manifest.webmanifest` icons array
      populated (192, 512, maskable present), `theme_color`/`background_color` are `#fbfaf7`
      not oklch; `dist/index.html` has favicon, apple-touch-icon, and manifest `<link>`s,
      single (not duplicated) `theme-color` meta tag
- [ ] Manual check: Chrome DevTools → Application → Manifest panel — **not run**, no browser
      automation tool available this session (consistent gap noted across every UI phase
      this session). Substituted with an equivalent-coverage check instead: served
      `dist/` via `pnpm preview` and `curl`-verified every referenced asset actually
      resolves (`manifest.webmanifest`, `pwa-192x192.png`, `pwa-512x512.png`,
      `maskable-icon-512x512.png`, `favicon.ico`, `icon.svg`,
      `apple-touch-icon-180x180.png` — all 200s), plus direct inspection of the manifest/
      HTML content above. This covers the same underlying facts the DevTools panel would
      report (icons present, correctly typed/sized, resolvable) but not the panel's own
      installability-heuristic verdict — worth a real browser check before relying on this
      being installable in practice.

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
