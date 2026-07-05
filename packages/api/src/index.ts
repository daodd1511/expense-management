import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware, type AuthEnv } from './middleware/auth'
import { jsonError } from './lib/http'
import { transactionsRouter } from './routes/transactions'
import { accountsRouter } from './routes/accounts'
import { categoriesRouter } from './routes/categories'
import { budgetsRouter } from './routes/budgets'
import { favoritesRouter } from './routes/favorites'
import { subscriptionsRouter } from './routes/subscriptions'
import { analyticsRouter } from './routes/analytics'

const app = new Hono<AuthEnv>()

app.use('*', logger())
app.use('*', cors())

app.onError((err, c) => {
  console.error('[uncaught]', err)
  return jsonError(c, 500, 'Internal server error')
})

app.get('/health', (c) => c.json({ ok: true }))

// All /api/* routes require auth
const api = app.basePath('/api')
api.use('*', authMiddleware)
api.route('/transactions', transactionsRouter)
api.route('/accounts', accountsRouter)
api.route('/categories', categoriesRouter)
api.route('/budgets', budgetsRouter)
api.route('/favorites', favoritesRouter)
api.route('/subscriptions', subscriptionsRouter)
api.route('/analytics', analyticsRouter)

const port = Number(process.env.PORT ?? 3000)

serve({
  fetch: app.fetch,
  port,
})

console.log(`API listening on port ${port}`)
