import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import * as service from './service'

export async function getBalanceTrend(c: Context<AuthEnv>) {
  return c.json(await service.getBalanceTrend(c.get('userId'), c.req.query('referenceMonth')))
}
