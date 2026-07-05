import { Hono } from 'hono'
import {
  aggregateMonthlyTotals,
  monthlyTotalsResponseSchema,
  transactionRowSchema,
  toTransaction,
} from '@wallet/shared'
import { getSupabase } from '../db/supabase'
import { jsonError, mapDbError, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const analyticsRouter = new Hono<AuthEnv>()

analyticsRouter.get('/monthly-totals', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', userId)

  if (error) {
    return mapDbError(c, error)
  }

  const response = monthlyTotalsResponseSchema.safeParse({
    data: aggregateMonthlyTotals(parseRows(data, transactionRowSchema, toTransaction)),
  })

  if (!response.success) {
    return jsonError(c, 500, 'Monthly totals failed validation', response.error.flatten())
  }

  return c.json(response.data)
})
