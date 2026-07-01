# Handoff — BE Integration Phase 1 (mid-execution)

## Context

Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
Branch: `master`
Goal: Convert flat repo into pnpm monorepo (`packages/web`, `packages/api`, `packages/shared`).
Full plan: `BE_INTEGRATION_PLAN.md`

---

## Current State (mid-execution, NOT committed)

### What's already done (staged, not yet committed)

All web source files moved via `git mv` to `packages/web/`:
- `src/` → `packages/web/src/`
- `index.html` → `packages/web/index.html`
- `vite.config.ts` → `packages/web/vite.config.ts`
- `tsconfig.json` → `packages/web/tsconfig.json`
- `public/` → `packages/web/public/`
- `components.json` → `packages/web/components.json`

Root `package.json` updated to workspace root (no deps, just scripts).

### What exists on disk but NOT staged

- `packages/web/package.json` — created, has all web deps
- `packages/shared/src/index.ts` — placeholder
- `packages/shared/src/types.ts` — placeholder
- `packages/shared/package.json` — created
- `packages/api/src/` — empty directory only

### What is NOT done yet

Everything below must be completed before committing Phase 1.

---

## Remaining Steps — Do These In Order

### Step 1 — Update `pnpm-workspace.yaml`

Current content only has `allowBuilds`. Replace with:

```yaml
packages:
  - 'packages/*'

allowBuilds:
  msw: true
  sharp: true
```

File: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app/pnpm-workspace.yaml`

---

### Step 2 — Create `packages/shared/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"]
}
```

---

### Step 3 — Create `packages/api/package.json`

```json
{
  "name": "@wallet/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "@wallet/shared": "workspace:*",
    "hono": "4.12.25",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "5.7.3"
  }
}
```

---

### Step 4 — Create `packages/api/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"]
}
```

---

### Step 5 — Create `packages/api/src/db/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

// Service role key — never sent to browser
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
```

---

### Step 6 — Create `packages/api/src/middleware/auth.ts`

```ts
import type { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c: Context, next: Next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = await verify(token, process.env.SUPABASE_JWT_SECRET!)
    c.set('userId', payload.sub as string)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
  await next()
})
```

---

### Step 7 — Create `packages/api/src/routes/transactions.ts`

```ts
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const transactionsRouter = new Hono<AuthEnv>()

transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  // TODO Phase 2: implement
  return c.json({ data: [], userId })
})

transactionsRouter.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
transactionsRouter.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
transactionsRouter.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
```

---

### Step 8 — Create stub route files (same pattern as Step 7)

Create these 4 files with identical stub pattern — just change the variable name and router export:

- `packages/api/src/routes/accounts.ts` → export `accountsRouter`
- `packages/api/src/routes/categories.ts` → export `categoriesRouter`
- `packages/api/src/routes/budgets.ts` → export `budgetsRouter`
- `packages/api/src/routes/subscriptions.ts` → export `subscriptionsRouter`

Each file:
```ts
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const <name>Router = new Hono<AuthEnv>()

<name>Router.get('/', async (c) => c.json({ data: [], userId: c.get('userId') }))
<name>Router.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
<name>Router.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
<name>Router.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
```

---

### Step 9 — Create `packages/api/src/index.ts`

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { transactionsRouter } from './routes/transactions'
import { accountsRouter } from './routes/accounts'
import { categoriesRouter } from './routes/categories'
import { budgetsRouter } from './routes/budgets'
import { subscriptionsRouter } from './routes/subscriptions'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true }))

// All /api/* routes require auth
const api = app.basePath('/api')
api.use('*', authMiddleware)
api.route('/transactions', transactionsRouter)
api.route('/accounts', accountsRouter)
api.route('/categories', categoriesRouter)
api.route('/budgets', budgetsRouter)
api.route('/subscriptions', subscriptionsRouter)

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
```

---

### Step 10 — Scope `packages/web/tsconfig.json` include

Current `include` is `["**/*.ts", "**/*.tsx"]` — from `packages/web/` this is fine, but be explicit. Verify the file looks like this (read it first):

The `include` should be:
```json
"include": ["src/**/*.ts", "src/**/*.tsx"]
```

If it currently says `["**/*.ts", "**/*.tsx"]` — update it to `["src/**/*.ts", "src/**/*.tsx"]`.

---

### Step 11 — Run `pnpm install` from repo root

```bash
pnpm install
```

This installs all workspace packages. Expect it to link `@wallet/shared` and `@wallet/api` correctly.

---

### Step 12 — Verify build passes

```bash
# From repo root:
pnpm build
# Should run: pnpm --filter @wallet/web build
# Which runs: tsc -b && vite build inside packages/web/

# Also typecheck web explicitly:
cd packages/web && pnpm exec tsc --noEmit
```

Fix any errors before proceeding.

---

### Step 13 — Update `AGENTS.md`

The file is stale — references old paths (`lib/`, `components/`, `src/components`). Update it to reflect:
- Commands now run from root: `pnpm dev`, `pnpm build`
- Web source is at `packages/web/src/`
- API source is at `packages/api/src/`
- Shared types at `packages/shared/src/`

---

### Step 14 — Commit

Stage and commit in two logical commits:

**Commit 1** — monorepo restructure (the git mv + new package.json files):
```bash
git add packages/web/package.json packages/shared/ pnpm-workspace.yaml package.json AGENTS.md
git commit -m "Monorepo Phase 1: move web into packages/web, scaffold api and shared"
```

**Commit 2** — api skeleton:
```bash
git add packages/api/
git commit -m "Add packages/api skeleton: Hono + Bun, auth middleware, route stubs"
```

---

## Checklist

- [ ] `pnpm-workspace.yaml` updated with `packages: ['packages/*']`
- [ ] `packages/shared/tsconfig.json` created
- [ ] `packages/api/package.json` created
- [ ] `packages/api/tsconfig.json` created
- [ ] `packages/api/src/db/supabase.ts` created
- [ ] `packages/api/src/middleware/auth.ts` created
- [ ] `packages/api/src/routes/transactions.ts` created
- [ ] `packages/api/src/routes/accounts.ts` created
- [ ] `packages/api/src/routes/categories.ts` created
- [ ] `packages/api/src/routes/budgets.ts` created
- [ ] `packages/api/src/routes/subscriptions.ts` created
- [ ] `packages/api/src/index.ts` created
- [ ] `packages/web/tsconfig.json` `include` scoped to `src/**`
- [ ] `pnpm install` runs clean from repo root
- [ ] `pnpm build` passes (web builds to dist/)
- [ ] `cd packages/web && pnpm exec tsc --noEmit` — zero errors
- [ ] `AGENTS.md` updated with correct paths and commands
- [ ] Phase 1 committed (2 commits as above)

---

## Phase 1 Exit Criteria

App behaviour is **identical** to before. Only the folder structure changed:
- `pnpm dev` still starts Vite dev server for web
- `pnpm build` still produces `packages/web/dist/`
- Zero TypeScript errors in packages/web
- packages/api and packages/shared exist as valid TS packages (stub, not yet functional)

---

## What Comes Next (Phase 2 — Build API)

After Phase 1 is committed and green:

1. Move `packages/web/src/core/types.ts` → `packages/shared/src/types.ts`, re-export from web
2. Move Zod schemas from `packages/web/src/features/*/db.ts` → `packages/shared/src/schemas/`
3. Implement each route in `packages/api/src/routes/*.ts` using service role Supabase client
4. Add `.env` to `packages/api/` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
5. Test each endpoint with curl/REST client against real Supabase data
6. Deploy BE to VPS, configure Caddy `/api/*` proxy

Full API spec in `BE_INTEGRATION_PLAN.md`.

---

## Key Files To Read Before Starting

- `BE_INTEGRATION_PLAN.md` — full architecture decisions
- `packages/web/src/core/types.ts` — domain types (Account, Transaction, Category, Budget, Subscription)
- `packages/web/src/features/*/db.ts` — current Supabase query layer (will become BE route implementations)
- `packages/web/src/core/database.types.ts` — generated Supabase DB types

## Env Vars Needed for Phase 2

These go in `packages/api/.env` (never commit):
```
SUPABASE_URL=           # same as current VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=   # from Supabase dashboard → Settings → API
SUPABASE_JWT_SECRET=         # from Supabase dashboard → Settings → API → JWT Secret
PORT=3000
```
