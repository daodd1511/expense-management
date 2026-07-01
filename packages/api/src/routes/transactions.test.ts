import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { AuthEnv } from '../middleware/auth'
import { transactionsRouter } from './transactions'

function tomorrowIsoDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('transactionsRouter', () => {
  it('rejects future transaction dates', async () => {
    const app = new Hono<AuthEnv>()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-1')
      await next()
    })
    app.route('/transactions', transactionsRouter)

    const response = await app.request('/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        amount: 1213,
        categoryId: 'cat-1',
        accountId: 'acc-1',
        merchant: 'AAA',
        date: tomorrowIsoDate(),
        receipt: null,
      }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request body',
      details: {
        fieldErrors: {
          date: ['Transaction date cannot be in the future'],
        },
      },
    })
  })
})
