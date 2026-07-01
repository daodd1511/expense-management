# Wallet — Handoff

## State: Implementation phase — Next→Vite conversion pending

Main folder: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
Deprecated: `~/dev/personal/wallet` (old docs + HTML mockups, ignore)

---

## What exists

### Spec docs (this repo)
- `PLAN.md` — authoritative system plan (stack, data model, features, execution phases)
- `PRODUCT.md` — product register, brand personality, design principles
- `DESIGN.md` — full design system (register-gold, tonal, warm-paper, OKLCH tokens)
- `FEATURES.md` — feature checklist with status

### UI (this repo — current state)
React components built as Next.js 16 app. **Design-complete, no real system.**
In-memory store resets on refresh. No persistence, no auth, no backend.

| Area | Status | Notes |
|---|---|---|
| Dashboard | ✅ Done | KPIs, donut chart, trend chart, recent txns, budget overview, account balances |
| Transactions | ✅ Done | Mobile grouped list + swipe actions; desktop table + pagination + bulk delete |
| Add/Edit transaction | ✅ Done | Bottom sheet (mobile), drawer (desktop), date picker, receipt attach |
| Accounts | ✅ Done | List, add/edit/delete, swipe actions, net worth card |
| Budgets | ✅ Done (display) | Budget bars + state colors. **CRUD missing — no add/edit/delete** |
| Categories | ✅ Done (add/edit) | **Delete missing** |
| Settings | ✅ Done | Theme toggle, language switch |
| Persistence | ❌ None | In-memory only — resets on refresh |

---

## Immediate next task: Next → Vite conversion (in place)

All existing components are client-only (no RSC, no server routes used). Conversion is mechanical.

### Steps in order

1. **Install Vite + deps, remove Next**
   ```bash
   pnpm remove next next-themes
   pnpm add -D vite @vitejs/plugin-react vite-tsconfig-paths
   pnpm add @vite-pwa/assets-generator vite-plugin-pwa
   pnpm add @fontsource/be-vietnam-pro
   ```

2. **`vite.config.ts`** (new file)
   ```ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import tsconfigPaths from 'vite-tsconfig-paths'
   import { VitePWA } from 'vite-plugin-pwa'

   export default defineConfig({
     plugins: [
       react(),
       tsconfigPaths(),
       VitePWA({
         registerType: 'autoUpdate',
         manifest: {
           name: 'Wallet',
           short_name: 'Wallet',
           theme_color: 'oklch(0.985 0.004 90)',
           background_color: 'oklch(0.985 0.004 90)',
           display: 'standalone',
           start_url: '/',
           icons: [], // add 192/512 icons
         },
       }),
     ],
   })
   ```

3. **Tailwind 4:** swap `@tailwindcss/postcss` for `@tailwindcss/vite`
   - `pnpm remove @tailwindcss/postcss && pnpm add -D @tailwindcss/vite`
   - Remove `postcss.config.mjs`
   - Add `import tailwindcss from '@tailwindcss/vite'` to `vite.config.ts` plugins

4. **`index.html`** (root, replace `app/` shell)
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>Wallet</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```

5. **`src/main.tsx`** (replaces `app/layout.tsx` + `app/page.tsx`)
   ```tsx
   import '@fontsource/be-vietnam-pro/400.css'
   import '@fontsource/be-vietnam-pro/500.css'
   import '@fontsource/be-vietnam-pro/600.css'
   import '@fontsource/be-vietnam-pro/700.css'
   import './app/globals.css'
   import { StrictMode } from 'react'
   import { createRoot } from 'react-dom/client'
   import { StoreProvider } from './lib/store'
   import { LangProvider } from './lib/i18n'
   import { ThemeProvider } from './components/theme-provider'
   import ResponsiveApp from './components/responsive-app'

   createRoot(document.getElementById('root')!).render(
     <StrictMode>
       <ThemeProvider>
         <LangProvider>
           <StoreProvider>
             <ResponsiveApp />
           </StoreProvider>
         </LangProvider>
       </ThemeProvider>
     </StrictMode>
   )
   ```

6. **`components/theme-provider.tsx`** — rewrite (remove next-themes)
   ```tsx
   'use client'
   import { createContext, useContext, useEffect, useState } from 'react'

   type Theme = 'light' | 'dark' | 'system'
   const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
     theme: 'system', setTheme: () => {},
   })

   export function ThemeProvider({ children }: { children: React.ReactNode }) {
     const [theme, setThemeState] = useState<Theme>(
       () => (localStorage.getItem('theme') as Theme) ?? 'system'
     )
     useEffect(() => {
       const root = document.documentElement
       const dark =
         theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
       root.classList.toggle('dark', dark)
       localStorage.setItem('theme', theme)
     }, [theme])
     return (
       <ThemeCtx.Provider value={{ theme, setTheme: setThemeState }}>
         {children}
       </ThemeCtx.Provider>
     )
   }

   export const useTheme = () => useContext(ThemeCtx)
   ```

7. **`globals.css`** — add Be Vietnam Pro to font stack
   ```css
   @theme inline {
     --font-sans: 'Be Vietnam Pro', ui-sans-serif, system-ui, -apple-system, sans-serif;
     /* rest unchanged */
   }
   ```

8. **Motion + z-index tokens** — append to `:root` in `globals.css`
   ```css
   :root {
     --duration-fast:  120ms;
     --duration-base:  200ms;
     --duration-slow:  320ms;
     --ease-out:       cubic-bezier(0.16, 1, 0.3, 1);
     --ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
     --z-dropdown:  100;
     --z-sticky:    200;
     --z-overlay:   300;
     --z-modal:     400;
     --z-toast:     500;
     --z-tooltip:   600;
   }
   @media (prefers-reduced-motion: reduce) {
     * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
   }
   ```

9. **Delete** `app/` dir, `next.config.mjs`, `next-env.d.ts`, `postcss.config.mjs`

10. **Strip `'use client'`** directives (harmless but noisy; strip opportunistically)

11. **`tsconfig.json`** — ensure `"baseUrl": "."` and `"paths": { "@/*": ["./*"] }` (vite-tsconfig-paths handles resolution)

12. **`package.json` scripts** — replace next scripts:
    ```json
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
    ```

---

## After conversion: Phase 1 — persistence + computed balances

See `PLAN.md` → Persistence and Balances sections.

Key changes to `lib/store.tsx`:
- Replace `useState(seedData)` with `useLocalStorage` hooks (or `idb-keyval` for IndexedDB)
- `Account.balance` (static) → `Account.openingBalance`; add `computeBalance(accountId, transactions)` pure fn
- Add budget CRUD mutations (`addBudget`, `updateBudget`, `deleteBudget`)
- Add category `deleteCategory`

---

## Key decisions (locked — don't re-litigate)

- **Stack:** Vite + React 19, Tailwind 4, shadcn/base-ui, recharts, vite-plugin-pwa
- **Host:** self-hosted VPS, static `dist/` behind Caddy (auto-HTTPS)
- **Backend (Phase 2):** Supabase + Google OAuth + RLS on `owner_id`
- **Persistence (Phase 1):** localStorage / IndexedDB — no backend yet
- **Balances:** computed (`openingBalance + Σincome − Σexpense ± transfers`), never stored
- **Font:** Be Vietnam Pro (Vietnamese diacritic support)
- **Design:** register-gold accent, tonal/no-shadow depth, warm-paper neutrals (see `DESIGN.md`)
- **i18n:** custom flat-key (`lib/i18n.tsx`), vi default, en secondary — no react-i18next
- **Layouts:** two purpose-built surfaces — mobile (`<1024px` bottom nav + bottom sheet) and desktop (`≥1024px` sidebar + drawer). Not responsive scaling.
- **Amounts:** VND integers, `Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'})` → `100.000 ₫`
- **Transfers:** single row, `accountId` (from) + `toAccountId` (to), excluded from income/expense aggregates
