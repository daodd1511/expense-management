# PWA — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".

## STATUS

- Current phase: All phases complete
- Phase 1 — Installable icons + manifest + favicon: done
- Phase 2 — Service worker offline: done-with-debt
- Verification debt: manual browser checks (2 items) deferred; review checklist incomplete

---

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
      Register Gold (`#b07200`, computed from `oklch(0.60 0.15 78)`).
      **Superseded after initial completion:** the first pass reused the existing
      `icon.svg` mark geometry, just recolored — user later asked for a genuinely new,
      custom-designed mark instead of a recolor of the default. Replaced with a
      hand-built `$` glyph (bold geometric S-curve + vertical stroke, stroke-based path,
      not the old filled-shape mark) — reads clearly at both 512px and 64px, previewed via
      direct `sharp` rendering before committing. `public/icon.svg` (the adaptive
      light/dark favicon) got the same `$` glyph for consistency, keeping its
      `prefers-color-scheme` media-query swap structure, now stroke-based (`.foreground {
      stroke: ... }`) instead of fill-based to match the new geometry. Also removed
      several unreferenced legacy/placeholder assets from `public/` while touching this
      area (`apple-icon.png`, `icon-dark-32x32.png`, `icon-light-32x32.png`,
      `placeholder-*` starter-template leftovers) — confirmed zero references anywhere in
      source before deleting
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

- [x] Offline detection mechanism: `packages/web/src/core/useOnlineStatus.ts` — a
      `navigator.onLine` + `window` `online`/`offline` event-listener hook. Chosen over
      fetch-failure inference because `error-handling`'s async-callback/toast infra
      (needed to consume a distinguished fetch error usefully) hadn't landed yet at
      execution time — a proactive connectivity hook stands alone with no dependency on
      that spec, resolving the soft-coupling PLAN.md flagged
- [x] Distinct "you're offline" messaging: `packages/web/src/shared/components/
      OfflineBanner.tsx` — a fixed, non-dismissible top-of-viewport banner (`role="status"`,
      `bg-expense`) shown whenever `useOnlineStatus()` reports offline, mounted at the app
      root in `main.tsx` (inside `LangProvider`, above `AuthGate`, so it shows regardless of
      auth state). New i18n key `offline.banner`, VI + EN. This is a single global
      notification, not a per-request toast — deliberately not built on `sonner`/
      `MutationCache.onError` since `error-handling` hasn't landed; a persistent banner
      covers both reads and writes uniformly without needing per-mutation wiring, so no
      rework is expected once `error-handling` does land (that spec's toasts would be
      layered on top for per-action feedback, not a replacement for this banner)
- [x] No write-queue, no auto-retry-on-reconnect — writes attempted while offline fail with
      the same offline messaging as reads (the global banner, not a per-request message),
      nothing gets queued (explicit non-goal per PLAN.md) — confirmed no new queuing logic
      was added anywhere in this phase

**Verification gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` passes
- [x] `pnpm --filter @wallet/web test` passes — 29/29 (26 prior + 3 new in
      `OfflineBanner.test.tsx`: hidden while online, shown on `offline` event, hidden again
      on `online` event — via mocked `navigator.onLine` + dispatched window events)
- [ ] Manual check: in Chrome DevTools → Network tab, set throttling to "Offline", attempt a
      read (load a screen that fetches) and a write (submit a form) — confirm both surface
      the offline-specific message rather than a generic error, and that going back online
      and retrying manually succeeds normally — **not run**, no browser automation tool
      available this session (same consistent gap as Phase 1 and every prior UI phase).
      `navigator.onLine`/event-listener behavior is standard and covered by the unit tests
      above, but the real DevTools-throttle path (does the actual `fetch` fail the way
      expected, does the banner's fixed positioning look right in the real layout) hasn't
      been visually confirmed

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete both phase branches.
