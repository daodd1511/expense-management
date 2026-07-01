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
