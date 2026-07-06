import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { accountsRouter } from './features/accounts/routes'
import { analyticsRouter } from './features/analytics/routes'
import { budgetsRouter } from './features/budgets/routes'
import { categoriesRouter } from './features/categories/routes'
import { favoritesRouter } from './features/favorites/routes'
import { subscriptionsRouter } from './features/subscriptions/routes'
import { transactionsRouter } from './features/transactions/routes'
import { authMiddleware, type AuthEnv } from './middleware/auth'
import { errorMiddleware, handleError } from './middleware/error'
import { loggerMiddleware } from './middleware/logger'

/** Builds the Hono app with cross-cutting middleware and all feature routes wired in. */
export function createApp() {
  const app = new Hono<AuthEnv>()

  app.use('*', loggerMiddleware)
  app.use('*', cors())
  app.use('*', errorMiddleware)
  app.onError(handleError)

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
