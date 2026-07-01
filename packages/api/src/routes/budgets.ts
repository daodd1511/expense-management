import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'

export const budgetsRouter = new Hono<AuthEnv>()

budgetsRouter.get('/', async (c) => c.json({ data: [], userId: c.get('userId') }))
budgetsRouter.post('/', async (c) => c.json({ error: 'Not implemented' }, 501))
budgetsRouter.patch('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
budgetsRouter.delete('/:id', async (c) => c.json({ error: 'Not implemented' }, 501))
