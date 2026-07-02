import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthEnv } from '../middleware/auth'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../db/supabase', () => ({
  getSupabase,
}))

import { categoriesRouter } from './categories'

type StubResult = { data?: unknown; error?: unknown; count?: number }

/**
 * Generic chainable Supabase client stub. Every query-builder method returns
 * the same object so any call sequence (`.from().select().eq()...`) chains
 * cleanly; awaiting the chain at any point (via an explicit terminal method
 * like `.maybeSingle()`/`.single()`, or by awaiting the chain itself for
 * head-count queries) consumes the next queued result in order.
 */
function createSupabaseStub(results: StubResult[]) {
  let call = 0
  const next = () => results[call++] ?? { data: null, error: null }

  const builder: Record<string, unknown> = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
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
  app.route('/categories', categoriesRouter)
  return app
}

describe('categoriesRouter', () => {
  beforeEach(() => {
    getSupabase.mockReset()
  })

  it('rejects POST with a parentId whose type does not match', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        {
          data: { id: 'parent-1', type: 'income', parent_id: null, owner_id: null },
          error: null,
        },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Groceries',
        icon: 'Utensils',
        color: 'chart-1',
        type: 'expense',
        parentId: 'parent-1',
      }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'type must match parentId category type',
    })
  })

  it('rejects POST with a parentId that is itself a child', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        {
          data: { id: 'parent-1', type: 'expense', parent_id: 'grandparent-1', owner_id: null },
          error: null,
        },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Groceries',
        icon: 'Utensils',
        color: 'chart-1',
        type: 'expense',
        parentId: 'parent-1',
      }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'parentId target is itself a child; nesting is capped at 2 levels',
    })
  })

  it('returns 403 when patching a system-owned category', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        { data: { id: 'cat-1', type: 'expense', parent_id: null, owner_id: null }, error: null },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/categories/cat-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'System categories cannot be edited',
    })
  })

  it('rejects PATCH bodies that attempt to change type', async () => {
    getSupabase.mockReturnValue(createSupabaseStub([]))

    const app = buildApp()
    const response = await app.request('/categories/cat-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'income' }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'type is immutable and cannot be patched',
    })
  })

  it('rejects re-parenting onto a category of a different type', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        { data: { id: 'cat-1', type: 'expense', parent_id: null, owner_id: 'user-1' }, error: null },
        {
          data: { id: 'parent-2', type: 'income', parent_id: null, owner_id: null },
          error: null,
        },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/categories/cat-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: 'parent-2' }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'parentId target type does not match category type',
    })
  })

  it('returns 403 when deleting a system-owned category', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([{ data: { id: 'cat-1', owner_id: null }, error: null }]),
    )

    const app = buildApp()
    const response = await app.request('/categories/cat-1', { method: 'DELETE' })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'System categories cannot be deleted',
    })
  })

  it('returns 409 when deleting a category that has children', async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        { data: { id: 'cat-1', owner_id: 'user-1' }, error: null },
        { data: null, error: null, count: 2 },
      ]),
    )

    const app = buildApp()
    const response = await app.request('/categories/cat-1', { method: 'DELETE' })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Category has children; delete or reassign them first',
    })
  })
})
