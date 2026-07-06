# Kanagawa Theme — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — done
- Phase 1 — Palette tokens + PWA colors: done
- Phase 2 — Matte pass + hardcoded color sweep: pending
- Verification debt: none

## Phase 1 — Palette tokens + PWA colors

Branch: `kanagawa-theme/phase-1-palette-tokens` (off `develop`)

The entire palette lives in CSS custom properties plus three hardcoded PWA values; swapping
them recolors the whole app in one reviewable diff, with no component edits. Phase 2's
matte pass only makes visual sense on top of these colors.

- [x] `packages/web/src/shared/styles/globals.css` — replace all color values in `:root`
      (Washi light) and `.dark` (Wave dark) per the token mapping table in PLAN.md,
      converted to `oklch()` at existing precision. Covers: background/foreground,
      card/popover pairs, primary, secondary/muted, accent (gold demotes here),
      destructive, border/input (dark `--input` slightly lighter than `--border`), ring,
      `--income`/`--expense`/`--transfer` families, sidebar family, `--chart-1..12`
      rebuilt from the kanagawa hue sets in PLAN.md (ordering may be tuned for
      adjacent-series contrast; hue set is fixed). Non-color tokens (`--radius`, motion,
      z-index, fonts) untouched.
- [x] `packages/web/vite.config.ts` — `theme_color` and `background_color` (currently
      `#fbfaf7`) → Washi background hex.
- [x] `packages/web/index.html` — `theme-color` meta → Washi background; add a
      dark-mode `theme-color` meta (`media="(prefers-color-scheme: dark)"`) with the Wave
      background if it doesn't fight the app's manual theme toggle (judgment call in
      PLAN.md — skipped because media-based theme-color would track OS theme instead of the
      app's manual override).
- [x] Contrast verification: script-compute WCAG ratios for every fg/bg token pair in both
      modes (body-text pairs ≥ 4.5:1, large-text/UI pairs ≥ 3:1); where a pair fails,
      nudge OKLCH lightness only (hue/chroma fixed) and re-run. Record the final ratio
      table (or script output) in the PR description. Known-tightest pair:
      muted-foreground on card, light mode.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm build`

**Review checklist (user, at PR review):**
- [ ] Light mode reads as cream washi paper, dark mode as sumi ink — dashboard, transactions,
      budgets, subscriptions, settings, both mobile (<1024px) and desktop widths.
- [ ] Buttons/FAB/active nav/focus ring are wave blue in both modes; subscription/recurring
      chips and due banner carry the gold accent.
- [ ] Income green / expense red / transfer aqua are distinguishable at a glance in the
      transaction list and charts, both modes.
- [ ] Secondary text (timestamps, category subtitles, section labels) is comfortably
      readable on cards in light mode, ideally checked on a phone in daylight.
- [ ] Installed PWA: splash and status-bar chrome match the new background (no `#fbfaf7`
      remnant).
- [ ] Theme toggle light → dark → system still switches cleanly with no unstyled flash.

**On completion:** run agent gate, update STATUS + checkboxes, rerun `pnpm specs:index`,
stop and ask before push/PR. Review checklist goes into the PR description.

## Phase 2 — Matte pass + hardcoded color sweep

Branch: `kanagawa-theme/phase-2-matte-pass` (off `kanagawa-theme/phase-1-palette-tokens`,
stacked)

Component-level edits, separated from the token swap so each diff is small and revertable:
shadows→borders can only be judged against the Phase 1 palette.

- [ ] Shadow → border matte pass over the ~18 `shadow-*` occurrences. In-flow surfaces
      (cards, tiles, stat blocks) drop the shadow class and get a visible `border-border`;
      floating layers (popover, select dropdown, overlay/sheet) keep exactly one minimal
      low-alpha shadow (PLAN.md judgment call). Files:
      `packages/web/src/shared/components/ui/card.tsx`,
      `ui/select.tsx`, `ui/popover.tsx`, `ui/overlay.tsx`,
      `shared/components/Charts.tsx`, `shared/components/LoadingScreen.tsx`,
      `layouts/mobile/MobileApp.tsx`,
      `features/auth/components/SignIn.tsx`, `features/auth/components/AuthCardLayout.tsx`,
      `features/categories/components/CategoriesPage.tsx`,
      `features/transactions/components/TransactionForm.tsx`.
- [ ] Hardcoded color literal sweep: `rg` for hex/`oklch(`/`rgb(` literals in
      `packages/web/src` outside `globals.css`; re-point chart/inline-style colors at
      tokens (`var(--chart-n)`, semantic tokens). Leave non-themable literals (e.g.
      pure-black scrims) only with an inline justification.
- [ ] Verify no `shadow-sm|md|lg|xl|2xl|shadow-primary|shadow-black` classes remain except
      the sanctioned floating-layer shadows (`rg` check, list survivors in the PR).

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test`
- [ ] `pnpm build`

**Review checklist (user, at PR review):**
- [ ] Cards/tiles sit flat on the paper background, separated by ink borders — no floating
      drop-shadow look on dashboard, budgets, or account screens, both modes.
- [ ] Popovers, select dropdowns, and the mobile bottom sheet still visually separate from
      the page behind them (the one retained shadow works on both washi and sumi).
- [ ] Charts pick up the kanagawa ramp — no stale colors from inline literals.
- [ ] Transaction form and auth screens carry the matte look with no regressions in
      focus/hover states.

**On completion:** run agent gate, update STATUS + checkboxes, rerun `pnpm specs:index`,
stop and ask before push/PR. Review checklist goes into the PR description.
