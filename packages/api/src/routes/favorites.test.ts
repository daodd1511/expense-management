import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../middleware/auth'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../db/supabase', () => ({
  getSupabase,
}))

import { favoritesRouter } from './favorites'

type StubResult = { data?: unknown; error?: unknown; count?: number }

/** Same generic chainable Supabase stub used in categories.test.ts. */
function createSupabaseStub(results: StubResult[]) {
  let call = 0
  const next = () => results[call++] ?? { data: null, error: null }

  const builder: Record<string, unknown> = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    single: vi.fn(() => Promise.resolve(next())),
    then: (resolve: (value: StubResult) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(next()).then(resolve, reject),
  }

  return builder
}

function buildApp() {
  const app = new Hono<AuthEnv>()
  app.use('*', async (c, next) => {
    c.set('userId', 'user-1')
    await next()
  })
  app.route('/favorites', favoritesRouter)
  return app
}

const favoriteRow = {
  id: 'fav-1',
  user_id: 'user-1',
  category_id: 'cat-1',
  created_at: '2026-07-02T00:00:00.000Z',
}

describe('favoritesRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('lists the current user favorites', async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: [favoriteRow], error: null }]))

    const app = buildApp()
    const response = await app.request('/favorites')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [{ categoryId: 'cat-1' }] })
  })

  it('adds a new favorite', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        { data: null, error: null },
        { data: favoriteRow, error: null },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'cat-1' }),
    })

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ data: { categoryId: 'cat-1' } })
  })

  it('is idempotent when the favorite already exists', async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: favoriteRow, error: null }]))

    const app = buildApp()
    const response = await app.request('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'cat-1' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: { categoryId: 'cat-1' } })
  })

  it('removes an existing favorite', async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: { id: 'fav-1' }, error: null }]))

    const app = buildApp()
    const response = await app.request('/favorites/cat-1', { method: 'DELETE' })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('returns 404 when removing a category that is not favorited', async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: null, error: null }]))

    const app = buildApp()
    const response = await app.request('/favorites/cat-1', { method: 'DELETE' })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'Favorite not found' })
  })
})
