import { describe, expect, it } from 'vitest'
import { transactionCreateSchema } from './transaction.dto'

function tomorrowIsoDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('transactionCreateSchema', () => {
  it('normalizes an ISO timestamp date in create payloads', () => {
    const result = transactionCreateSchema.parse({
      type: 'expense',
      amount: 1213,
      categoryId: 'cat-1',
      accountId: 'acc-1',
      merchant: 'AAA',
      date: '2026-07-01T12:00:00.000Z',
      receipt: null,
    })

    expect(result.date).toBe('2026-07-01')
  })

  it('rejects future transaction dates', () => {
    const result = transactionCreateSchema.safeParse({
      type: 'expense',
      amount: 1213,
      categoryId: 'cat-1',
      accountId: 'acc-1',
      merchant: 'AAA',
      date: tomorrowIsoDate(),
      receipt: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Transaction date cannot be in the future')
    }
  })
})
