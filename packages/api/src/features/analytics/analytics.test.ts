import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../../middleware/auth'
import { handleError } from '../../middleware/error'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
  getSupabase,
}))

import { analyticsRouter } from './routes'

function buildClient({ accounts, transactions }: { accounts: unknown[]; transactions: unknown[] }) {
  const from = vi.fn((table: string) => {
    if (table === 'accounts') {
      const eqArchived = vi.fn().mockResolvedValue({ data: accounts, error: null })
      const eqOwner = vi.fn().mockReturnValue({ eq: eqArchived })
      return { select: vi.fn().mockReturnValue({ eq: eqOwner }) }
    }
    const eqOwner = vi.fn().mockResolvedValue({ data: transactions, error: null })
    return { select: vi.fn().mockReturnValue({ eq: eqOwner }) }
  })

  return { from }
}

function makeApp() {
  const app = new Hono<AuthEnv>()
  app.onError(handleError)
  app.use('*', async (c, next) => {
    c.set('userId', 'user-1')
    await next()
  })
  app.route('/analytics', analyticsRouter)
  return app
}

describe('analyticsRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('computes a zero-filled 6-month balance trend ending at referenceMonth', async () => {
    getSupabase.mockReturnValue(
      buildClient({
        accounts: [
          {
            id: 'acc-1',
            owner_id: 'user-1',
            name: 'Checking',
            kind: 'bank',
            opening_balance: 1000,
            archived: false,
            created_at: '2020-01-01T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'tx-1',
            owner_id: 'user-1',
            type: 'income',
            amount: 500,
            category_id: null,
            account_id: 'acc-1',
            to_account_id: null,
            merchant: 'Salary',
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
            category_id: null,
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
      }),
    )

    const response = await makeApp().request('/analytics/balance-trend?referenceMonth=2026-07')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        { month: '2026-02', balance: 1000 },
        { month: '2026-03', balance: 1000 },
        { month: '2026-04', balance: 1000 },
        { month: '2026-05', balance: 1000 },
        { month: '2026-06', balance: 1000 },
        { month: '2026-07', balance: 1300 },
      ],
    })
  })

  it('excludes archived accounts and their transactions from the trend', async () => {
    getSupabase.mockReturnValue(
      buildClient({
        accounts: [
          {
            id: 'acc-1',
            owner_id: 'user-1',
            name: 'Checking',
            kind: 'bank',
            opening_balance: 500,
            archived: false,
            created_at: '2020-01-01T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'tx-1',
            owner_id: 'user-1',
            type: 'income',
            amount: 9999,
            category_id: null,
            account_id: 'acc-archived',
            to_account_id: null,
            merchant: 'Old salary',
            note: null,
            tx_date: '2026-07-01',
            receipt_url: null,
            subscription_id: null,
            created_at: '2026-07-01T08:00:00.000Z',
          },
        ],
      }),
    )

    const response = await makeApp().request('/analytics/balance-trend?referenceMonth=2026-07')
    const body = (await response.json()) as { data: { month: string; balance: number }[] }

    expect(body.data.at(-1)).toEqual({ month: '2026-07', balance: 500 })
  })

  it('rejects an invalid referenceMonth', async () => {
    getSupabase.mockReturnValue(buildClient({ accounts: [], transactions: [] }))

    const response = await makeApp().request('/analytics/balance-trend?referenceMonth=not-a-month')

    expect(response.status).toBe(400)
  })
})
