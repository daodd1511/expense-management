# Personal Expense App — v1 Spec

## Scope & Stack
| Decision | Choice |
|---|---|
| Users | Single (you), **B-ready**: every record tagged `owner_id` |
| Platform | Web + installable **PWA**, **online-only** (no offline sync) |
| Frontend | **Vite + React 19** (static SPA) + **Tailwind 4** + shadcn/base-ui, custom flat-key i18n (vi/en) — UI ported from wallet2 |
| Host | **Self-hosted VPS**, static files behind Caddy/nginx (no Node runtime) |
| Backend | **Supabase** (Postgres + Auth + Storage), free tier |
| Auth | **Google OAuth**, RLS on `owner_id = auth.uid()` |
| Backend host | **Supabase** (data/files) — Phase 2 |
| Locale | VND-first, vi number/date format via `Intl` + `date-fns` vi |

## Money rules
- Store `amount` as **integer in currency smallest unit**. VND scale=1 (no minor units), USD scale=100.
- Keep `currency` column everywhere. **VND-only v1**, USD = future drop-in, no FX engine.
- Format via `Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'})`.

## Data model
```
transaction
  id, owner_id, currency
  amount         int (smallest unit)
  type           expense | income | transfer
  category_id    FK (null for transfer)
  account_id     FK (source / sole)
  to_account_id  FK nullable (transfer dest)
  merchant, note text nullable
  occurred_at    timestamptz
  receipt_url    nullable (Supabase Storage)
  created_at

account
  id, owner_id, name, currency
  type            cash | bank | card | ewallet
  opening_balance int
  archived        bool
  # balance = computed: opening + Σincome − Σexpense ± transfers

category
  id, owner_id (null = system preset)
  name_vi, name_en, icon, color
  parent_id      nullable (reserved, flat v1)
  # seed VN presets + user custom

budget
  id, owner_id, category_id
  amount         int (monthly limit)
  period         month (hardcoded v1)
  start_month
  # spent vs limit = computed

template
  id, owner_id, name, amount, type, category_id, account_id, note
  # manual-trigger quick-add
```

## Features v1
- CRUD transactions (expense/income/transfer), photo receipt attach (compress client-side, no OCR)
- Accounts + computed balances
- Flat categories (VN presets + custom)
- Per-category monthly budgets, computed progress
- Templates (manual recurring)
- Dashboard: (1) month summary, (2) spend by category, (3) budget bars, (4) 6-mo trend, (5) account balances, (6) filterable transaction list
- Charts via recharts

## UI: two distinct layouts (NOT responsive-scaled)
Mobile and desktop are purpose-built, not one stretched. Breakpoint switch ~`lg`/1024px.

### Mobile (phone, PWA, thumb-first)
- Bottom tab nav: Home · Transactions · [+ FAB] · Budgets · Accounts
- Single-column, card-stacked
- Add transaction = bottom sheet, numeric-keypad-optimized
- Dashboard = stacked widgets
- Transactions = date-grouped rows, swipe actions
- Primary actions thumb-reachable (bottom)

### Desktop (wide web, mouse/keyboard, dense)
- Left sidebar nav (persistent): Dashboard, Transactions, Budgets, Accounts, Categories, Settings
- Multi-column dashboard grid: KPI row + 2–3 col widget grid (donut + trend + budget + accounts side by side)
- Transactions = full data table: sortable cols, inline filters, multi-select bulk actions, pagination
- Add/Edit = modal or right drawer (not full-screen sheet)
- Keyboard shortcuts (e.g. `N` = new), hover states, denser spacing, master-detail

### Shared (both, layout-adapted)
Dashboard, Transactions, Add/Edit, Accounts, Budgets, Categories.
Amount color states: red expense, green income, neutral transfer.
Charts: donut (category), line (6-mo trend), bar → recharts.

## Deferred (post-v1)
- OCR receipt auto-fill
- True scheduled recurring (pg_cron/edge fn)
- CSV bank/e-wallet import
- Multi-currency + FX
- Multi-user / household (B): splits, sharing, permissions
- Offline-first write queue
- Cash-flow report (#7), category nesting, weekly/yearly budgets

## Flagged tradeoffs
- **Free-tier pause:** Supabase free project sleeps after 7d idle. Daily use = never. Do own `pg_dump` (no free backups).
- **Computed balances:** trivial at personal scale; revisit only if rows explode (won't).
- **Online-only:** no-signal logging = rare in VN urban 4G; add write-queue later if real pain.
- **Receipt storage:** 1GB free ≈ 2–5k photos; compress before upload.

---

## UI Adoption & Execution Plan

This file is the authoritative **system plan**, and this repo is the **main
folder** going forward. The repo currently ships as a Next.js 16 app that is
**design UI only** — feature-complete React components, but no real system
(in-memory store, no persistence, no auth, no backend). Plan = **convert this
repo in place to a Vite + React static SPA** and graft the system onto it under
this spec. (The old `~/dev/personal/wallet` docs folder is deprecated.)

### Foundation
- **Vite + React 19 static SPA, converted in place.** The existing components
  are effectively a client SPA already (nearly every file is `'use client'`,
  in-memory store, zero server components) — so the Next→Vite conversion is mechanical.
- **Why Vite static over Next:** target host is a **self-hosted VPS**. Static
  build = no Node runtime to babysit, ~0 idle RAM, serve files behind Caddy/nginx.
  Next would force a long-lived `next start` process (its server-route upside is
  unused — single-user app, Supabase RLS covers secrets) or a static export that
  strips Next's only advantages. Vite also has turnkey PWA (`vite-plugin-pwa`).
- **custom flat-key i18n** kept as-is (covers vi/en + date-fns vi locale); react-i18next dropped.

### Conversion checklist (Next → Vite, in place)
Mechanical; small surface. Few Next-specific APIs in use:
- **Remove `app/`** (`layout.tsx`, `page.tsx`) → Vite `index.html` + `main.tsx`
  mounting providers (Store, i18n, Theme) around `ResponsiveApp`.
- **`next-themes` → small custom theme provider** (toggle `.dark` class on `<html>`,
  persist to localStorage). wallet2's `theme-provider.tsx` / `theme-toggle.tsx` rewritten.
- **`next/font` → `@fontsource/be-vietnam-pro`** (or self-host woff2). Be Vietnam Pro
  per design cherry-pick.
- **Tailwind 4:** swap `@tailwindcss/postcss` for **`@tailwindcss/vite`** plugin. `globals.css` imports unchanged.
- **`@/*` path alias:** configure in `tsconfig` + `vite-tsconfig-paths`.
- **Routing:** none needed v1 — app is tab-state-driven (`responsive-app.tsx`),
  not URL-routed. Add `react-router` later only if deep-linking wanted.
- `'use client'` directives: harmless no-ops under Vite; strip opportunistically.
- shadcn/base-ui, recharts, react-day-picker, date-fns: framework-agnostic, port unchanged.

### PWA & deploy
- **PWA:** `vite-plugin-pwa` (Workbox). Online-only per spec → minimal SW for
  installability (precache app shell), no offline write queue. Manifest + icons + theme-color.
- **Build:** `vite build` → static `dist/`.
- **VPS:** serve `dist/` via Caddy (auto-HTTPS) or nginx. No Node process, no Docker
  required. PWA install requires HTTPS — Caddy handles certs.

### Design system — keep this repo's identity, cherry-pick from the deprecated wallet docs
This repo's existing visual identity stays (see this repo's `docs/design/DESIGN.md`):
**register-gold action accent, tonal/no-shadow depth, warm-paper neutrals,
green=income / red=expense semantic contract.** It is more distinctive than the
deprecated wallet docs' indigo+terracotta+shadow direction and already built.
The two systems are ~80% aligned in spirit (calm, numbers-lead, anti-SaaS,
anti-bank). Import only what's missing here, from the old wallet `docs/design/DESIGN.md`:
- **Be Vietnam Pro** font (system font has weaker Vietnamese diacritics; app is VN-first) via `@fontsource/be-vietnam-pro`.
- **Motion tokens** (durations + easings) and **z-index scale**.
- Explicit **Vietnamese-specific rules** (VND `Intl` format, week starts Monday, `name_vi` fallback).

NOT adopted: the old docs' indigo/terracotta palette, shadow scale.

### Persistence — phased
- **Phase 1 (now):** replace in-memory `lib/store.tsx` state with
  **localStorage/IndexedDB** so data survives refresh. Closes the top unchecked
  item in wallet2 FEATURES.md (Data → persistent storage).
- **Phase 2 (later):** Supabase (Postgres + Auth + Storage), **Google OAuth**,
  RLS on `owner_id = auth.uid()`. At this phase, reconcile to the richer data
  model below (owner_id, currency, templates).

### Balances — computed, not stored
wallet2 stores `Account.balance` as a static field that `addTransaction` never
updates (its own form label already says "opening balance" / "Số dư ban đầu").
Persisting this = permanently drifting wrong numbers. **Fix as part of Phase 1:**
store `openingBalance`; derive current balance =
`opening + Σincome − Σexpense ± transfers`, mirroring existing pure selectors
(`monthSummary`, `spentForCategory`) in `store.tsx`.

### Feature scope — this iteration
Beyond persistence + computed balances:
- **Budget add/edit/delete** — wallet2 renders budget bars but has no mutation; a visible dead end.
- **Category delete** — completes category CRUD (add/edit already exist).

Deferred: **Templates** (quick-add; net-new, not in wallet2 — revisit later),
**`currency` field** in the type model (add at Supabase phase; VND-only until then).

### Model reconciliation notes (for Phase 2 / Supabase)
wallet2's `lib/types.ts` is leaner than this spec's data model. Migrate toward
spec at the Supabase phase:
- Add `owner_id` everywhere (B-ready / multi-user).
- Add `currency` + integer-smallest-unit amounts (VND scale=1).
- `Category` single `name` → keep, or split `name_vi`/`name_en` if presets need localization.
- `Budget` gains `period` / `start_month` (monthly hardcoded until then).
- Add `template` entity if/when templates ship.
