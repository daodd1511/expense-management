import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const categoriesRouter = new Hono<AuthEnv>()

categoriesRouter.get('/', async (c) => c.json({ data: [], userId: c.get('userId') }))
categoriesRouter.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
categoriesRouter.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
categoriesRouter.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
