import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from './auth'

const { verifyAccessToken } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
}))

vi.mock('../lib/jwt', () => ({
  verifyAccessToken,
}))

import { authMiddleware } from './auth'

describe('authMiddleware', () => {
  beforeEach(() => {
    verifyAccessToken.mockReset()
  })

  it('returns 401 when the authorization header is missing', async () => {
    const app = new Hono<AuthEnv>()
    app.use('*', authMiddleware)
    app.get('/', (c) => c.json({ ok: true }))

    const response = await app.request('/')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('stores the verified user id in context', async () => {
    const app = new Hono<AuthEnv>()
    app.use('*', authMiddleware)
    app.get('/', (c) => c.json({ userId: c.get('userId') }))

    verifyAccessToken.mockResolvedValue('user-123')

    const response = await app.request('/', {
      headers: { Authorization: 'Bearer token-123' },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ userId: 'user-123' })
    expect(verifyAccessToken).toHaveBeenCalledWith('token-123')
  })

  it('returns 401 when verification succeeds without a string sub claim', async () => {
    const app = new Hono<AuthEnv>()
    app.use('*', authMiddleware)
    app.get('/', (c) => c.json({ ok: true }))

    verifyAccessToken.mockResolvedValue(null)

    const response = await app.request('/', {
      headers: { Authorization: 'Bearer token-123' },
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' })
  })
})
