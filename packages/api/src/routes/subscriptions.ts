import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const subscriptionsRouter = new Hono<AuthEnv>()

subscriptionsRouter.get('/', async (c) => c.json({ data: [], userId: c.get('userId') }))
subscriptionsRouter.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
subscriptionsRouter.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
subscriptionsRouter.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
