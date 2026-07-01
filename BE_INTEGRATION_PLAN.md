# BE Integration Plan

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Motivation | Third-party integrations + future-proofing | Server-side secrets (bank APIs, OCR, notifications), extensibility |
| Runtime | Hono on Bun | Already pinned in package.json, native TS, fast, VPS-deployable |
| API style | REST | Standard, universal, no client lock-in |
| Auth | JWT passthrough + secret key | FE keeps Google OAuth via Supabase Auth; BE verifies JWT via Supabase JWKS and uses a server-side secret key for DB |
| Scope | Full proxy | All data through BE; anon key leaves browser entirely |
| Structure | pnpm monorepo | `packages/web` + `packages/api` + `packages/shared`; shared types flow automatically |
| Deployment | Same VPS, Caddy proxy | `/api/*` → Bun process (port 3000); static FE on same domain; no CORS |
| Migration | 3-phase | Each phase independently shippable |

---

## Auth Flow

```
FE (browser)
  1. Google OAuth via Supabase Auth → receives access_token (JWT)
  2. Stores token in Supabase session (localStorage, existing behaviour)
  3. Every API request: Authorization: Bearer <supabase_access_token>

BE (Hono + Bun)
  4. Middleware verifies JWT signature using Supabase JWKS
  5. Extracts user_id from JWT sub claim
  6. Queries Supabase using SUPABASE_SECRET_KEY (server-side only)
  7. Filters all queries by owner_id = user_id
```

`supabase-js` stays in `packages/web` for Auth only (token exchange, session management).
Data operations: removed from FE entirely, handled by BE.

---

## Monorepo Structure

```
packages/
  shared/                   ← types + Zod schemas (extracted from current code)
    src/
      types.ts              ← moved from core/types.ts
      schemas/
        account.ts          ← Zod schema from features/accounts/db.ts
        transaction.ts
        category.ts
        budget.ts
        subscription.ts
      secure-parse.ts       ← moved from core/db/secure-parse.ts
    package.json

  api/                      ← Hono + Bun (new)
    src/
      index.ts              ← Bun entry, Hono app, route registration
      middleware/
        auth.ts             ← JWT verification, injects userId into context
      routes/
        transactions.ts
        accounts.ts
        categories.ts
        budgets.ts
        subscriptions.ts
      db/
        supabase.ts         ← createClient with server-side secret key
    .env                    ← SUPABASE_URL, SUPABASE_SECRET_KEY, PORT
    package.json

  web/                      ← current src/ moves here
    src/                    ← unchanged structure (core/, features/, shared/, layouts/)
    index.html
    vite.config.ts
    tsconfig.json
    .env                    ← VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (auth only)
    package.json

pnpm-workspace.yaml
package.json                ← root scripts: dev, build, typecheck all packages
```

---

## REST API Endpoints

All routes are prefixed `/api` and require `Authorization: Bearer <token>`.

### Transactions
```
GET    /api/transactions          ?month=YYYY-MM (optional filter)
POST   /api/transactions
PATCH  /api/transactions/:id
DELETE /api/transactions/:id
DELETE /api/transactions          body: { ids: string[] }  (bulk delete)
```

### Accounts
```
GET    /api/accounts
POST   /api/accounts
PATCH  /api/accounts/:id
DELETE /api/accounts/:id
```

### Categories
```
GET    /api/categories            returns system (owner_id=null) + user-owned
POST   /api/categories
PATCH  /api/categories/:id        user-owned only
DELETE /api/categories/:id        user-owned only; nullifies refs in transactions/subscriptions/budgets
```

### Budgets
```
GET    /api/budgets
POST   /api/budgets
PATCH  /api/budgets/:categoryId
DELETE /api/budgets/:categoryId
```

### Subscriptions
```
GET    /api/subscriptions
POST   /api/subscriptions
PATCH  /api/subscriptions/:id
DELETE /api/subscriptions/:id
POST   /api/subscriptions/:id/log  creates transaction + advances next_due_date atomically
```

---

## packages/api internals

### Auth middleware (`middleware/auth.ts`)
```ts
// Verifies Supabase JWT, injects userId into Hono context
// Uses Supabase JWKS / signing keys to verify signature
// Returns 401 if token missing, expired, or invalid
```

### Route pattern
Each route file:
1. Receives `userId` from context (set by auth middleware)
2. Validates request body with Zod (`packages/shared` schemas)
3. Queries Supabase via service role client, filtered by `owner_id = userId`
4. Returns JSON — same shape as current `features/*/db.ts` mappers

### Service role client (`db/supabase.ts`)
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@shared/database.types'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)
```

---

## FE Changes (packages/web)

### What changes
- `features/*/db.ts` — replace Supabase calls with `fetch('/api/...')` + `Authorization` header
- `core/supabase.ts` — kept only for Auth (session management); data client removed
- `core/store.tsx` — unchanged (still composes TanStack Query hooks)
- `features/*/queries.ts` — unchanged (useQuery/useMutation stay identical)

### Auth helper
```ts
// shared fetch wrapper that injects the current session token
async function apiFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...init?.headers,
    },
  })
}
```

### What stays the same
- `features/auth/` — Google OAuth flow unchanged
- `features/*/queries.ts` — TanStack Query hooks unchanged
- `core/store.tsx` — StoreValue interface unchanged; all consumers unchanged
- All UI components — zero changes

---

## Caddy Config (VPS)

```caddy
app.yourdomain.com {
  # API — proxy to Bun
  handle /api/* {
    reverse_proxy localhost:3000
  }

  # SPA — serve static dist/
  handle {
    root * /var/www/wallet/dist
    try_files {path} /index.html
    file_server
  }
}
```

---

## Migration Phases

### Phase 1 — Restructure (no behaviour change)
- Move `src/` → `packages/web/src/`
- Move `index.html`, `vite.config.ts`, `tsconfig.json` → `packages/web/`
- Create `packages/shared/` — extract `core/types.ts` + Zod schemas + `secure-parse.ts`
- Create `packages/api/` skeleton — Hono app, auth middleware, empty route stubs
- Update `pnpm-workspace.yaml`
- Update all `@/` imports in `packages/web` to resolve correctly
- **Exit criteria:** `pnpm build` passes, app works identically, TypeScript clean

### Phase 2 — Build API
- Implement all route handlers in `packages/api/`
- Wire JWT middleware
- Reuse Zod schemas from `packages/shared`
- Test each endpoint (curl / REST client) against real Supabase data
- Deploy BE to VPS, configure Caddy `/api/*` proxy
- **Status:** route handlers are implemented; middleware uses JWKS auth; `/health` and `/api/*` return JSON through the Vite proxy; full authenticated route verification and VPS deployment remain
- **Exit criteria:** all endpoints return correct data for authenticated requests; FE still calls Supabase directly (unchanged)

### Phase 3 — Switch FE
- Replace `features/*/db.ts` — Supabase calls → `apiFetch` calls
- Remove `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from data path (keep for auth only)
- Remove service role / data concerns from `packages/web`
- **Status:** FE data modules already call `apiFetch`; direct browser Supabase data calls have been removed; transaction dates are normalized to `YYYY-MM-DD`, future transaction dates are blocked in UI and API validation
- **Exit criteria:** app fully functional through BE; no direct Supabase data calls from browser; TypeScript clean

---

## Environment Variables

### packages/api (.env)
```
SUPABASE_URL=
SUPABASE_SECRET_KEY=          ← never in browser
PORT=3000
```

### packages/web (.env)
```
VITE_SUPABASE_URL=            ← kept for Auth only
VITE_SUPABASE_PUBLISHABLE_KEY=← kept for Auth only
VITE_API_BASE=/api            ← base URL for apiFetch
```

---

## What This Unlocks (Post-Migration)

- **Third-party integrations** — API keys live in `packages/api/.env`, never in browser
- **Bank CSV import** — POST /api/import/csv, parse + bulk insert server-side
- **OCR receipt** — POST /api/receipts/ocr, call OCR provider server-side
- **Scheduled jobs** — Bun cron or pg_cron trigger BE endpoint
- **Email/push notifications** — server-side, triggered by BE logic
- **Rate limiting** — Hono middleware, uniform across all endpoints
- **Audit log** — middleware logs every mutation with userId + timestamp
- **Multi-user** — extend auth middleware, add household/sharing logic to routes
