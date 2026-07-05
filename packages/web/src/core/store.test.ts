import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/core/types'
import { monthSummary } from './store'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100_000,
    categoryId: 'food',
    accountId: 'acc-1',
    merchant: 'Merchant',
    date: '2026-07-05',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 5, 10, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('monthSummary', () => {
  it('sums income and expense within the current local month only', () => {
    const summary = monthSummary([
      makeTx({ type: 'income', amount: 500_000, date: '2026-07-01' }),
      makeTx({ type: 'expense', amount: 200_000, date: '2026-07-10' }),
      // Outside the current month — must not be counted.
      makeTx({ type: 'expense', amount: 999_999, date: '2026-06-30' }),
      makeTx({ type: 'income', amount: 999_999, date: '2026-08-01' }),
    ])

    expect(summary.income).toBe(500_000)
    expect(summary.expense).toBe(200_000)
    expect(summary.balance).toBe(300_000)
  })

  it('ignores transfers', () => {
    const summary = monthSummary([
      makeTx({ type: 'transfer', amount: 50_000, date: '2026-07-01' }),
    ])
    expect(summary.income).toBe(0)
    expect(summary.expense).toBe(0)
  })

  it('includes a transaction dated the 1st of the current month (F3 boundary regression)', () => {
    const summary = monthSummary([makeTx({ type: 'expense', amount: 100, date: '2026-07-01' })])
    expect(summary.expense).toBe(100)
  })
})
