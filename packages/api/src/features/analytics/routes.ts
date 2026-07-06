import { Hono } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import * as controller from './controller'

export const analyticsRouter = new Hono<AuthEnv>()

analyticsRouter.get('/balance-trend', controller.getBalanceTrend)
