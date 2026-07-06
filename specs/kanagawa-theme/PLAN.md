# Kanagawa Theme — Plan

Recolor the app to a Kanagawa-inspired "pigment on paper" palette: **Washi** (softened
cream paper) for light mode, **Wave** (sumi ink) for dark mode, derived from the
kanagawa.nvim Lotus/Wave palettes. Colors only — typography, icons, radius, spacing, and
motion are untouched. Chosen from `specs/kanagawa-theme/mockup.html` (variant B + C).

## Decisions (from grill session, 2026-07-06)

| Topic | Choice |
|-------|--------|
| Palette root | kanagawa.nvim pairing — Lotus-derived light, Wave dark. Not the raw Hokusai print pigments. |
| Light variant | **Washi** (variant B): Lotus hues at lower chroma — cream paper, not the true-yellow `#F2ECBC`. |
| Primary | **Wave blue** (`#4D699B` light / `#7E9CD8` dark) for all interactive elements (buttons, FAB, active nav, ring, sidebar accents). Gold demotes to a secondary warm accent (subscription/recurring chips, due banner). |
| Money colors | Convention kept, pigment muted: income = spring green (`#6F894E` / `#98BB6C`), expense = autumn red (`#C84053` / `#D5545F`), transfer = wave aqua (`#597B75` / `#7AA89F`). Destructive stays on the red ramp. |
| Surface treatment | **Flat matte**: in-flow cards/tiles separated by ink-tinted borders, not drop shadows. No texture assets, no wave motifs (the mockup's hero-card wave crest is explicitly rejected). |
| Scope | **Colors only.** Font stays Be Vietnam Pro; icons, `--radius`, motion tokens, z-index scale all unchanged. |
| Process | Mockup → this plan → EXECUTION.md via spec-plan → phased implementation. |

## Token mapping

Source values are kanagawa.nvim hex; implement as `oklch()` in
`packages/web/src/shared/styles/globals.css` to match the existing convention (convert at
implementation time, round to existing precision). `--card-2`-style values below map onto
the existing `--muted` / `--secondary` slots — no new token names are needed except where
noted.

| Token | Light (Washi) | Dark (Wave) |
|-------|---------------|-------------|
| `--background` | `#F4EFDD` | `#1F1F28` (sumiInk1) |
| `--foreground` | `#545464` (lotusInk1) | `#DCD7BA` (fujiWhite) |
| `--card` / `--popover` | `#FAF6E8` | `#2A2A37` (sumiInk2) |
| `--card-foreground` | `#545464` | `#DCD7BA` |
| `--primary` | `#4D699B` (lotusBlue4) | `#7E9CD8` (crystalBlue) |
| `--primary-foreground` | `#F8F4E6` | `#16161D` (sumiInk0) |
| `--secondary` / `--muted` | `#EFE9D2` | `#363646` (sumiInk3) |
| `--secondary-foreground` | `#43436C` (lotusInk2) | `#DCD7BA` |
| `--muted-foreground` | `#8A8980` (lotusGray3) | `#8F8D7F` |
| `--accent` | gold-soft `#E9DFAE` | gold-soft `#49443A` |
| `--accent-foreground` | `#77713F` (lotusYellow) | `#E6C384` (carpYellow) |
| `--destructive` | `#C84053` (lotusRed) | `#D5545F` |
| `--border` / `--input` | `#D8D0AF` | `#3A3A4B` (input slightly lighter) |
| `--ring` | `#4D699B` | `#7E9CD8` |
| `--income` (+fg/muted) | `#6F894E` / on-color / `#E2E3BD` | `#98BB6C` / on-color / `#2F3B28` |
| `--expense` (+fg/muted) | `#C84053` / on-color / `#EFD7C5` | `#D5545F` / on-color / `#43242A` |
| `--transfer` (+muted) | `#597B75` (lotusTeal) / `#DFE4D3` | `#7AA89F` (waveAqua2) / `#2A3934` |
| `--sidebar` family | card-mixed paper, blue accents (mirror primary/accent) | sumiInk-mixed, blue accents |

Chart ramp (`--chart-1..12`) rebuilt from kanagawa hues at matched lightness, ordered for
adjacent-contrast: blue, green, orange, violet, red, teal, gold, pink, sky, yellow,
dragon-blue, spring-violet. Light row from Lotus values (e.g. `#4D699B #6F894E #CC6D00
#766B90 #C84053 #597B75 #77713F #B35B79 #6693BF #DE9800 #658594 #9282AA`), dark row from
Wave values (e.g. `#7E9CD8 #98BB6C #FFA066 #957FB8 #E46876 #7AA89F #E6C384 #D27E99
#7FB4CA #FF9E3B #658594 #9CABCA`). Exact ordering may be tuned during implementation for
adjacent-series contrast; hue set is fixed.

## Judgment calls (not asked, noted here)

- **Floating layers keep a whisper of shadow.** "Flat matte" applies to in-flow cards and
  tiles. Popovers, select dropdowns, and sheets sit on same-tone paper — border alone
  doesn't separate them; they keep one minimal soft shadow (single low-alpha ink layer),
  everything else goes border-only.
- **Contrast floor:** every fg/bg pair must hold WCAG AA (4.5:1 body text, 3:1 large
  text/UI). Kanagawa's muted pigments run close to the line on cream paper — verify with
  a contrast check during implementation and nudge lightness (not hue) where needed.
  `#8A8980` on `#FAF6E8` (muted-foreground on card) is the known-tightest pair.
- **PWA colors:** `theme_color`/`background_color` in `packages/web/vite.config.ts` and
  the `theme-color` meta in `packages/web/index.html` hardcode the old `#fbfaf7` — update
  to the washi background (and add a dark-mode `theme-color` meta if trivial).

## Scope of work

1. `packages/web/src/shared/styles/globals.css` — replace all `:root` and `.dark` color
   values with the mapping above (OKLCH). Non-color tokens (`--radius`, motion, z-index,
   fonts) untouched.
2. Shadow → border matte pass. Current usage is small: ~18 occurrences across 11 files
   (`shared/components/ui/{card,select,popover,overlay}.tsx`, `Charts.tsx`,
   `LoadingScreen.tsx`, `layouts/mobile/MobileApp.tsx`, auth components,
   `CategoriesPage.tsx`, `TransactionForm.tsx`). In-flow surfaces: drop the shadow class,
   ensure a visible border. Floating layers: reduce to one minimal shadow per the
   judgment call above.
3. Hardcoded-color sweep: `rg` for hex/oklch literals in `packages/web/src` outside
   `globals.css` (charts, inline styles) and re-point them at tokens.
4. PWA/meta colors in `vite.config.ts` + `index.html`.
5. Contrast verification pass (AA) over the final token pairs, both modes.

## Non-goals

- No typography, icon, radius, spacing, or motion changes.
- No paper-grain textures, wave motifs, or decorative art direction.
- No component restructuring — class-level color/shadow edits only.
- No true-Lotus (variant A) light mode; not shipping a third theme option.
