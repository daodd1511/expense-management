import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { accountsRouter } from './features/accounts/routes'
import { authMiddleware, type AuthEnv } from './middleware/auth'
import { errorMiddleware } from './middleware/error'
import { loggerMiddleware } from './middleware/logger'
import { analyticsRouter } from './routes/analytics'
import { budgetsRouter } from './routes/budgets'
import { categoriesRouter } from './routes/categories'
import { favoritesRouter } from './routes/favorites'
import { subscriptionsRouter } from './routes/subscriptions'
import { transactionsRouter } from './routes/transactions'

/** Builds the Hono app with cross-cutting middleware and all feature routes wired in. */
export function createApp() {
  const app = new Hono<AuthEnv>()

  app.use('*', loggerMiddleware)
  app.use('*', cors())
  app.use('*', errorMiddleware)

  app.get('/health', (c) => c.json({ ok: true }))

  const api = app.basePath('/api')
  api.use('*', authMiddleware)
  api.route('/transactions', transactionsRouter)
  api.route('/accounts', accountsRouter)
  api.route('/categories', categoriesRouter)
  api.route('/budgets', budgetsRouter)
  api.route('/favorites', favoritesRouter)
  api.route('/subscriptions', subscriptionsRouter)
  api.route('/analytics', analyticsRouter)

  return app
}
