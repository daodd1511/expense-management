import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware, type AuthEnv } from './middleware/auth'
import { transactionsRouter } from './routes/transactions'
import { accountsRouter } from './routes/accounts'
import { categoriesRouter } from './routes/categories'
import { budgetsRouter } from './routes/budgets'
import { favoritesRouter } from './routes/favorites'
import { subscriptionsRouter } from './routes/subscriptions'

const app = new Hono<AuthEnv>()

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
api.route('/favorites', favoritesRouter)
api.route('/subscriptions', subscriptionsRouter)

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
