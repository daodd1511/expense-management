import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const accountsRouter = new Hono<AuthEnv>()

accountsRouter.get('/', async (c) => c.json({ data: [], userId: c.get('userId') }))
accountsRouter.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
accountsRouter.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
accountsRouter.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
