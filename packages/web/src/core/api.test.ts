import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}))

import { apiFetch } from './api'

describe('apiFetch', () => {
  beforeEach(() => {
    getSession.mockReset()
    vi.unstubAllGlobals()
  })

  it('throws when there is no auth session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    await expect(apiFetch('/transactions')).rejects.toThrow('Missing auth session')
  })

  it('sends authorization and JSON headers for requests with a body', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify({ amount: 1 }),
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ amount: 1 }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
    })
  })

  it('surfaces API JSON errors when present', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiFetch('/transactions')).rejects.toThrow('Unauthorized')
  })
})
