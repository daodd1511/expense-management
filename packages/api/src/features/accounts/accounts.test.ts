import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../../middleware/auth'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
  getSupabase,
}))

import { accountsRouter } from './routes'

function buildAccountsSelectResult(accountData: unknown[], transactionData: unknown[] = []) {
  const order = vi.fn().mockResolvedValue({ data: accountData, error: null })
  const secondEq = vi.fn().mockReturnValue({ order })
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
  const accountSelect = vi.fn().mockReturnValue({ eq: firstEq })

  const transactionEq = vi.fn().mockResolvedValue({ data: transactionData, error: null })
  const transactionSelect = vi.fn().mockReturnValue({ eq: transactionEq })
  const from = vi.fn((table: string) => {
    if (table === 'accounts') return { select: accountSelect }
    if (table === 'transactions') return { select: transactionSelect }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      from,
    },
  }
}

describe('accountsRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('returns mapped account data for the authenticated user', async () => {
    const { client } = buildAccountsSelectResult(
      [
        {
          id: 'acc-1',
          owner_id: 'user-1',
          name: 'Cash',
          kind: 'cash',
          opening_balance: 1000,
          archived: false,
          created_at: '2026-07-01T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'tx-1',
          owner_id: 'user-1',
          type: 'income',
          amount: 500,
          category_id: null,
          account_id: 'acc-1',
          to_account_id: null,
          merchant: 'Payroll',
          note: null,
          tx_date: '2026-07-01',
          receipt_url: null,
          subscription_id: null,
          created_at: '2026-07-01T08:00:00.000Z',
        },
        {
          id: 'tx-2',
          owner_id: 'user-1',
          type: 'expense',
          amount: 200,
          category_id: 'cat-1',
          account_id: 'acc-1',
          to_account_id: null,
          merchant: 'Groceries',
          note: null,
          tx_date: '2026-07-02',
          receipt_url: null,
          subscription_id: null,
          created_at: '2026-07-02T08:00:00.000Z',
        },
      ],
    )
    getSupabase.mockReturnValue(client)

    const app = new Hono<AuthEnv>()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-1')
      await next()
    })
    app.route('/accounts', accountsRouter)

    const response = await app.request('/accounts')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'acc-1',
          name: 'Cash',
          kind: 'cash',
          openingBalance: 1000,
          balance: 1300,
        },
      ],
    })
  })
})
