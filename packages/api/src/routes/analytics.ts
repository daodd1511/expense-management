import { Hono } from 'hono'
import {
  accountRowSchema,
  balanceTrendResponseSchema,
  computeBalanceTrend,
  monthFilterSchema,
  transactionRowSchema,
  toAccount,
  toTransaction,
} from '@wallet/shared'
import { getSupabase } from '../config/supabase'
import { jsonError, mapDbError, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const analyticsRouter = new Hono<AuthEnv>()

function currentMonthIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

analyticsRouter.get('/balance-trend', async (c) => {
  const userId = c.get('userId')

  // Caller-supplied local calendar month — the server has no per-user timezone, so it
  // never assumes its own clock is the user's "today" unless this is omitted.
  const referenceMonthParam = c.req.query('referenceMonth')
  let referenceMonth = currentMonthIso()
  if (referenceMonthParam !== undefined) {
    const parsed = monthFilterSchema.safeParse(referenceMonthParam)
    if (!parsed.success) {
      return jsonError(c, 400, 'Invalid referenceMonth query', parsed.error.flatten())
    }
    referenceMonth = parsed.data
  }

  const supabase = getSupabase()

  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', userId)
    .eq('archived', false)

  if (accountError) {
    return mapDbError(c, accountError)
  }

  const accounts = parseRows(accountData, accountRowSchema, toAccount)
  const accountIds = new Set(accounts.map((account) => account.id))
  const startingBalance = accounts.reduce((sum, account) => sum + account.openingBalance, 0)

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', userId)

  if (transactionError) {
    return mapDbError(c, transactionError)
  }

  // Only count activity on currently-active accounts — an archived account's opening
  // balance is excluded above, so its transactions shouldn't count toward net worth either.
  const transactions = parseRows(transactionData, transactionRowSchema, toTransaction).filter((tx) =>
    accountIds.has(tx.accountId),
  )

  const response = balanceTrendResponseSchema.safeParse({
    data: computeBalanceTrend(transactions, startingBalance, referenceMonth),
  })

  if (!response.success) {
    return jsonError(c, 500, 'Balance trend failed validation', response.error.flatten())
  }

  return c.json(response.data)
})
