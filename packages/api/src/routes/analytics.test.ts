import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../middleware/auth'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../db/supabase', () => ({
  getSupabase,
}))

import { analyticsRouter } from './analytics'

function buildTransactionsResult(data: unknown[]) {
  const eq = vi.fn().mockResolvedValue({ data, error: null })
  const select = vi.fn().mockReturnValue({ eq })

  return {
    client: {
      from: vi.fn().mockReturnValue({ select }),
    },
    spies: { eq, select },
  }
}

describe('analyticsRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('aggregates monthly income and expense for the authenticated user', async () => {
    const { client } = buildTransactionsResult([
      {
        id: 'tx-1',
        owner_id: 'user-1',
        type: 'income',
        amount: 1_000,
        category_id: null,
        account_id: 'acc-1',
        to_account_id: null,
        merchant: 'Salary',
        note: null,
        tx_date: '2026-06-30',
        receipt_url: null,
        subscription_id: null,
        created_at: '2026-06-30T08:00:00.000Z',
      },
      {
        id: 'tx-2',
        owner_id: 'user-1',
        type: 'expense',
        amount: 200,
        category_id: 'cat-1',
        account_id: 'acc-1',
        to_account_id: null,
        merchant: 'Food',
        note: null,
        tx_date: '2026-06-30',
        receipt_url: null,
        subscription_id: null,
        created_at: '2026-06-30T09:00:00.000Z',
      },
      {
        id: 'tx-3',
        owner_id: 'user-1',
        type: 'expense',
        amount: 300,
        category_id: 'cat-2',
        account_id: 'acc-1',
        to_account_id: null,
        merchant: 'Bills',
        note: null,
        tx_date: '2026-07-01',
        receipt_url: null,
        subscription_id: null,
        created_at: '2026-07-01T08:00:00.000Z',
      },
      {
        id: 'tx-4',
        owner_id: 'user-1',
        type: 'transfer',
        amount: 999,
        category_id: null,
        account_id: 'acc-1',
        to_account_id: 'acc-2',
        merchant: 'Move',
        note: null,
        tx_date: '2026-07-02',
        receipt_url: null,
        subscription_id: null,
        created_at: '2026-07-02T08:00:00.000Z',
      },
    ])
    getSupabase.mockReturnValue(client)

    const app = new Hono<AuthEnv>()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-1')
      await next()
    })
    app.route('/analytics', analyticsRouter)

    const response = await app.request('/analytics/monthly-totals')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        { month: '2026-06', income: 1000, expense: 200 },
        { month: '2026-07', income: 0, expense: 300 },
      ],
    })
  })
})
