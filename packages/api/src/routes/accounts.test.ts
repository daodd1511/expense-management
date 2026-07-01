import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../middleware/auth'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../db/supabase', () => ({
  getSupabase,
}))

import { accountsRouter } from './accounts'

function buildAccountsSelectResult(data: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data, error: null })
  const secondEq = vi.fn().mockReturnValue({ order })
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
  const select = vi.fn().mockReturnValue({ eq: firstEq })

  return {
    client: {
      from: vi.fn().mockReturnValue({ select }),
    },
    spies: { order, firstEq, secondEq, select },
  }
}

describe('accountsRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('returns mapped account data for the authenticated user', async () => {
    const { client } = buildAccountsSelectResult([
      {
        id: 'acc-1',
        owner_id: 'user-1',
        name: 'Cash',
        kind: 'cash',
        opening_balance: 1000,
        archived: false,
        created_at: '2026-07-01T00:00:00.000Z',
      },
    ])
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
        },
      ],
    })
  })
})
