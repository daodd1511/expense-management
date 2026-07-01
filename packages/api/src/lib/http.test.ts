import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { accountCreateSchema } from '@wallet/shared'
import { parseJsonBody } from './http'

describe('parseJsonBody', () => {
  it('returns a 400 response for invalid JSON', async () => {
    const app = new Hono()

    app.post('/', async (c) => {
      const parsed = await parseJsonBody(c, accountCreateSchema)
      return parsed.success ? c.json(parsed.data) : parsed.response
    })

    const response = await app.request('/', {
      method: 'POST',
      body: '{',
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body' })
  })

  it('returns validation details for invalid request bodies', async () => {
    const app = new Hono()

    app.post('/', async (c) => {
      const parsed = await parseJsonBody(c, accountCreateSchema)
      return parsed.success ? c.json(parsed.data) : parsed.response
    })

    const response = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request body',
      details: {
        fieldErrors: {
          kind: expect.any(Array),
          name: expect.any(Array),
          openingBalance: expect.any(Array),
        },
      },
    })
  })
})
