---
name: Personal Expense Manager
description: A private household ledger — calm, precise, and entirely yours.
colors:
  register-gold: "oklch(0.60 0.15 78)"
  register-gold-bright: "oklch(0.74 0.15 78)"
  gold-wash: "oklch(0.94 0.03 78)"
  dark-gold-ink: "oklch(0.28 0.06 78)"
  warm-paper: "oklch(0.985 0.004 90)"
  white-surface: "oklch(1 0 0)"
  deep-ink: "oklch(0.18 0.012 80)"
  muted-ink: "oklch(0.52 0.015 80)"
  warm-fill: "oklch(0.96 0.008 90)"
  warm-rule: "oklch(0.90 0.008 90)"
  night-vault: "oklch(0.16 0.01 80)"
  raised-night: "oklch(0.21 0.012 80)"
  ledger-green: "oklch(0.55 0.14 155)"
  ledger-green-wash: "oklch(0.94 0.04 155)"
  ledger-red: "oklch(0.55 0.2 25)"
  ledger-red-wash: "oklch(0.95 0.03 25)"
  budget-amber: "oklch(0.70 0.15 75)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.register-gold}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-hover:
    backgroundColor: "oklch(0.54 0.15 78)"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.lg}"
  button-outline:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input-text:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 12px"
---

# Design System: Personal Expense Manager

## 1. Overview

**Creative North Star: "The Personal Ledger"**

This system is built for the quiet act of keeping accounts. Not a dashboard for impressing stakeholders — a ledger for knowing where you stand. The interface recedes so the numbers can speak. Gold marks what needs attention or action; green and red tell the financial story at a glance; everything else is warm neutral, purposefully unremarkable.

Two failure modes are explicitly rejected. The generic SaaS dashboard (blue-centric, table-heavy, KPIs displayed as marketing) treats clarity as a feature to be sold rather than a condition to be maintained. The bloated bank app (corporate navy-and-gold, promotional hierarchy, upsell copy embedded in every margin) mistakes transactions for opportunities. This system has nothing to sell. It earns trust by staying quiet.

The dual-surface layout — mobile app with bottom navigation and drawer forms, desktop with sidebar navigation and inline tables — is not a responsive adaptation. Both are designed as first-class surfaces. The same data, the same features, the same visual contract across screen sizes.

**Key Characteristics:**
- Warm neutral surfaces with a single gold accent used strictly for action and state
- Semantic color contract: green = income, red = expense, gold = action; never decorative
- Single system sans-serif family at tight scale — numbers provide the personality, not the font
- Tonal layering only, no shadows — depth through surface color delta, not blur or lift
- Bilingual first: every visible string goes through the translation layer; no hardcoded text

## 2. Colors: The Ledger Palette

A restrained palette where color carries meaning, not mood. Three functional layers: neutral surfaces, one gold action accent, two semantic financial colors.

### Primary
- **Register Gold** (`oklch(0.60 0.15 78)`): The sole action color. Primary buttons, active navigation states, sidebar accents, healthy budget progress bars. In dark mode, brightens to `oklch(0.74 0.15 78)` to maintain ≥3:1 contrast against the dark surface. Warm amber-gold, reminiscent of an ink stamp.
- **Gold Wash** (`oklch(0.94 0.03 78)`): Low-saturation gold tint for accent backgrounds — sidebar active row fill, selected category chip hover, form type tab selected state. Never used as foreground text color on a white surface; contrast is insufficient.
- **Dark Gold Ink** (`oklch(0.28 0.06 78)`): Deep gold for text on Gold Wash backgrounds. Provides the required 4.5:1 contrast against Gold Wash.

### Neutral
- **Warm Paper** (`oklch(0.985 0.004 90)`): App background. Near-white with chroma 0.004 at hue 90 — a barely perceptible warmth that prevents optical coldness. Not cream, not sand; the tint is from the brand hue, not from warmth by default.
- **White Surface** (`oklch(1 0 0)`): Card surfaces and form sheet backgrounds. Pure white, visually distinct from Warm Paper so cards read as a lifted layer.
- **Deep Ink** (`oklch(0.18 0.012 80)`): Primary text, headings, amounts in neutral contexts. Near-black with a faint warm undertone.
- **Muted Ink** (`oklch(0.52 0.015 80)`): Secondary text — timestamps, category subtitles, form labels, metadata. Clears 4.5:1 against White Surface and Warm Paper.
- **Warm Fill** (`oklch(0.96 0.008 90)`): Muted backgrounds — secondary button fills, filter tab resting state, section background alternation, progress bar track.
- **Warm Rule** (`oklch(0.90 0.008 90)`): Borders and dividers. Input stroke at rest, card separators, table rules.
- **Night Vault** (`oklch(0.16 0.01 80)`): Dark mode background.
- **Raised Night** (`oklch(0.21 0.012 80)`): Dark mode card surface. 0.05L delta above Night Vault — sufficient for cards to read as raised without harsh contrast.

### Semantic
- **Ledger Green** (`oklch(0.55 0.14 155)`): Income amounts, positive account balances, budget OK state progress bars. Used on white surfaces; clears 4.5:1.
- **Ledger Green Wash** (`oklch(0.94 0.04 155)`): Income chip background, budget OK tint.
- **Ledger Red** (`oklch(0.55 0.2 25)`): Expense amounts, negative balances, budget exceeded state, destructive action backgrounds at 10% opacity.
- **Ledger Red Wash** (`oklch(0.95 0.03 25)`): Expense chip background, overbudget tint.
- **Budget Amber** (`oklch(0.70 0.15 75)`): Budget near-limit state (80–99%). Warmer and brighter than Register Gold to signal caution without alarm.

### Named Rules
**The One Voice Rule.** Register Gold appears on ≤15% of any given screen. Its restraint is the point — when everything is gold, nothing is urgent. Nav items, most form labels, and all secondary text stay in Muted Ink.

**The Semantic Color Rule.** Ledger Green means money in. Ledger Red means money out. These colors appear in exactly those roles and no others. A success state that isn't financial income uses a neutral treatment (icon + muted text). Never import a secondary meaning into a color that already carries a financial contract.

## 3. Typography

**Font:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` — one family throughout, no pairing.

**Character:** System-native at every platform. On macOS it resolves to SF Pro; on Windows, Segoe UI; on Android, Roboto. No custom loading, no font-swap flash, no render blocking. The design leverages the user's OS's own typographic voice — familiar and trusted. Numbers are the expressive element; the font stays neutral.

### Hierarchy

- **Display** (700, 2.25rem/36px, line-height 1.1, −0.02em tracking): Amount display in the transaction form keypad. The largest financial figure the user enters. One instance per full-screen view, never in a list.
- **Headline** (700, 1.5rem/24px, line-height 1.25): Desktop KPI amounts on the dashboard, monthly total in the mobile hero card. Used where a single number needs presence. Maximum one per visible panel.
- **Title** (600, 1rem/16px, line-height 1.4): Card section headings, modal headings, page titles in the desktop sidebar, bottom sheet titles. The main organizational signal within a surface.
- **Body** (400, 0.875rem/14px, line-height 1.5): Transaction names, list item text, table cell content, form input text. The workhorse. No line-length cap on data rows; 65–75ch on any prose-style content (notes, descriptions).
- **Label** (500, 0.75rem/12px, line-height 1.4): Form labels, timestamps, account type chips, filter badges, chart legends, nav labels on mobile. Never the primary text on a surface — always paired with Body or Title above it.

### Named Rules
**The Tabular Numbers Rule.** Every financial figure in a list, table, or comparative context uses `font-variant-numeric: tabular-nums` (the `.tabular` utility). Misaligned digits destroy the scannability of a ledger column and break the design's core promise.

**The Weight Tells Rule.** Weight communicates hierarchy; color communicates meaning. An amount is semibold (600) because it's important, and Ledger Green because it's income — these are independent signals. Never substitute one for the other.

## 4. Elevation

Flat by default. No `box-shadow` or `drop-shadow` anywhere in the system. Depth is communicated entirely through surface color delta:

- **Layer 0 — App Background:** Warm Paper (`oklch(0.985 0.004 90)`)
- **Layer 1 — Card Surfaces:** White Surface (`oklch(1 0 0)`) — 0.015L above background
- **Layer 2 — Sidebar / Panel:** Sidebar token (`oklch(0.99 0.004 90)`) — between background and card, creating the left-rail separation
- **Layer 3 — Overlay / Drawer:** Card surface with a translucent backdrop dimming the content below; no shadow on the sheet itself

The tonal delta between layers is intentionally small — this is a ledger, not an interactive game. Depth exists to separate surfaces, not to create drama.

### Named Rules
**The No-Shadow Rule.** Shadows are prohibited. Not even `filter: drop-shadow()`. If you are reaching for a shadow, ask whether a surface color step communicates the same separation. It does. Shadows import a visual grammar — depth through blur and spread — that conflicts with this system's tonal discipline.

**The Flat-At-Rest Rule.** No element gains depth at rest. Hover states may shift background fill (Ghost → Warm Fill); they do not gain shadows. Shadows, if ever introduced, belong only to floating UI: dropdowns, tooltips, command palettes — contexts where the element is literally above the layout.

## 5. Components

### Buttons

Shape-consistent across the surface. Rounded corners (0.75rem / 12px) on all non-icon sizes. All variants share the same focus ring treatment: 3px ring at 50% Register Gold opacity, border shifts to Register Gold.

- **Primary:** Register Gold fill (`--primary`), off-white text (`--primary-foreground`). Height: 32px (default), 36px (lg). Padding: 0 10px. Translates 1px down on `:active` (non-popup triggers). 10% lightness decrease on hover.
- **Outline:** Background/white fill, `--border` stroke, foreground text. Hover fills to Warm Fill. Used alongside a primary for secondary confirmation actions.
- **Ghost:** No background or border at rest. Warm Fill on hover. Icon buttons, tertiary actions, nav items at rest.
- **Destructive:** 10% opacity Ledger Red background, Ledger Red text. Restrained by design — the action is available, not promoted.
- **Disabled:** 50% opacity on all variants. `pointer-events: none`.

### Chips / Filter Pills

Used for category selection in the transaction form and transaction list filters.

- **Unselected:** `--background` fill, `--border` stroke, `--foreground` text. Hover: Warm Fill background.
- **Selected (category):** Category's own color token as background, white text, `border: transparent`. Each category color is a custom `--chart-N` or `--color-*` token distinct from Register Gold.
- **Selected (type filter):** Semantic color — income uses Ledger Green fill, expense uses Ledger Red fill, transfer uses muted fill with foreground text.
- **Shape:** Fully rounded (9999px). Padding: 6px 12px. Icon 14px when present, 6px gap before label.

### Cards / Containers

- **Corner style:** XL radius (1.05rem / ~17px) for standard content cards. 2XL (1.35rem / ~22px) for the mobile hero card and prominent summary panels.
- **Background:** White Surface (`--card`).
- **Shadow:** None — see Elevation.
- **Border:** None by default. 1px `--border` in dense list contexts where visual separation is needed without a separate surface.
- **Internal padding:** 16px (p-4) standard; 20px (p-5) for featured or prominent panels.

**The No-Nested-Card Rule.** A card inside a card is always wrong. Flatten to a list, a divider-separated section, or a row. Nested cards multiply visual weight and destroy spatial hierarchy.

### Inputs / Fields

- **Style:** Full-width, 40px height, 12px radius, 1px `--input` border stroke, `--background` fill.
- **Text:** Body (14px, 400 weight), `--foreground` color. Placeholder: `--muted-foreground`.
- **Focus:** Border shifts to `--ring` (Register Gold). 3px ring at 30% Register Gold opacity. No glow or blur — precise and unambiguous.
- **Labels:** Above the input field. 12px / 500 weight / `--muted-foreground`. Never placeholder-only labeling.
- **Textarea:** Same token treatment, 8px vertical padding, height set by `rows` prop.

### Progress Bars (Budget Bars)

The primary data visualization component. Appears in budget views across both mobile and desktop.

- **Track:** 8px height, fully rounded, `--muted` fill.
- **Indicator states:**
  - **< 80%:** Ledger Green — healthy, on track.
  - **80–99%:** Budget Amber (`oklch(0.70 0.15 75)`) — approaching limit.
  - **≥ 100%:** Ledger Red — exceeded.
- **Percentage and state label** appear as inline text to the right of the category name, not inside the bar.
- **Remaining amount** appears below the bar in Muted Ink, right-aligned.

### Navigation

**Desktop sidebar (240px):**
- Layer 2 surface (`--sidebar` token, `oklch(0.99 0.004 90)`).
- Nav items: 36px height, Body (14px / 500), ghost at rest — transparent background, Deep Ink text.
- Active state: Gold Wash fill + Register Gold text + Register Gold left-edge indicator (2px, inset).
- Icons: 16px, left-aligned with 16px padding. Label follows at 12px gap.
- Section dividers: `--sidebar-border` (10% white opacity in dark).

**Mobile bottom bar (60px):**
- Five equal-width items. Active: Register Gold icon + label. Inactive: Muted Ink icon + label.
- Label: Label scale (12px / 500). Icon: 20px.
- Respects `env(safe-area-inset-bottom)` for notch devices.

### Transaction Row (Signature Component)

The primary repeating unit — appears hundreds of times in a session. Precision matters at this scale.

- **Leading icon:** 40px × 40px, XL radius (17px). Background: category color at 16% opacity using `color-mix(in oklab, ...)`. Icon: 16px, category color at full opacity.
- **Transfer variant:** Muted background, `--transfer` color `ArrowLeftRight` icon.
- **Name line:** Body (14px / 600 semibold), `--foreground`.
- **Subtitle:** Label (12px / 400), `--muted-foreground`. Format: `Category · Account` or `From Account → To Account` for transfers.
- **Amount:** Body (14px / 600 semibold), tabular nums. Ledger Green for income (+prefix), Ledger Red for expense (−prefix), foreground for transfer.
- **Time:** Label (12px / 400), `--muted-foreground`, right-aligned.
- **Mobile swipe:** Translates left up to 132px. Reveals 64px Edit (accent fill) and 64px Delete (expense fill) action buttons. `transform: translateX()` with 200ms linear transition. `@media (prefers-reduced-motion: reduce)`: instant reveal, no translate animation.

## 6. Do's and Don'ts

### Do:
- **Do** use Register Gold exclusively for primary interactive elements (buttons, active states, selected indicators). Its rarity is its authority — the moment it stops meaning "action" it means nothing.
- **Do** apply Ledger Green to income and Ledger Red to expenses on every surface, every time. The color contract is the trust signal; breaking it once breaks it everywhere.
- **Do** apply `font-variant-numeric: tabular-nums` (`.tabular` utility class) to every financial figure that appears in a list, table, or column. Misaligned digits in a ledger are a design failure, not a cosmetic issue.
- **Do** use tonal surface color for depth: background → card (white) → sidebar (slightly warmer). Never reach for a shadow.
- **Do** pass every visible string through `t()` from `useLang()`. Both Vietnamese and English must render correctly at all label lengths. Design cannot assume label width.
- **Do** use `text-wrap: balance` on headings (Title and above) and `text-wrap: pretty` on multi-line notes or description text to prevent orphans in both languages.
- **Do** include every interaction state: default, hover, focus-visible, active, disabled. Half-finished component states are a product slop tell.
- **Do** respect `prefers-reduced-motion`: remove translate animations from swipe reveals, remove fill transitions from progress bars, remove all entrance choreography.

### Don't:
- **Don't** add `box-shadow` or `drop-shadow` anywhere. The system is tonal; shadows import a foreign visual grammar.
- **Don't** use Register Gold decoratively — no gold borders on inactive cards, no gold section dividers, no gold wash on non-interactive panels. Gold that doesn't mean "action" means nothing.
- **Don't** use Ledger Green or Ledger Red outside their income/expense semantic roles. A non-financial "success" state uses muted text + a checkmark, not green color. The semantic contract must be unbroken.
- **Don't** build this to look like a generic SaaS dashboard — no large blue KPI metric cards, no prominent data visualization in a hero position, no sidebar that promotes features over navigation.
- **Don't** build this to look like a corporate bank app — no navy backgrounds, no promotional copy, no upsell affordances, no heavy corporate hierarchy in the typography.
- **Don't** use gradient text (`background-clip: text` + gradient background). Emphasis is weight (semibold → bold) or size, never decoration.
- **Don't** put a card inside a card. Flatten to rows, lists, or divider-separated sections.
- **Don't** invent affordances for standard tasks. Inputs look like inputs. Buttons look like buttons. Selects use the system SelectTrigger. Familiarity is not blandness — it is trust.
- **Don't** hardcode Vietnamese or English strings. The `t()` function is not optional for any visible text. This includes aria-labels, placeholder text, and empty states.
