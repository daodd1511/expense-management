import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Subscription, Transaction } from '@/core/types'
import {
  buildNextDueDate,
  daysUntilDue,
  isAlreadyLoggedThisCycle,
  isDue,
  isDueSoon,
} from './helpers'

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 100_000,
    type: 'expense',
    categoryId: 'fun',
    accountId: 'acc-1',
    cadence: 'monthly',
    dayOfMonth: 1,
    monthOfYear: 1,
    nextDueDate: '2026-07-05',
    active: true,
    ...overrides,
  }
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100_000,
    categoryId: 'fun',
    accountId: 'acc-1',
    merchant: 'Netflix',
    date: '2026-07-05',
    subscriptionId: 'sub-1',
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

describe('daysUntilDue', () => {
  it('is 0 when due today', () => {
    expect(daysUntilDue(makeSub({ nextDueDate: '2026-07-05' }))).toBe(0)
  })

  it('is positive when due in the future', () => {
    expect(daysUntilDue(makeSub({ nextDueDate: '2026-07-10' }))).toBe(5)
  })

  it('is negative when overdue', () => {
    expect(daysUntilDue(makeSub({ nextDueDate: '2026-07-01' }))).toBe(-4)
  })

  it('does not drift a day at the local UTC+ boundary (regression for F3)', () => {
    // Same calendar day as "now", parsed at local midnight — must read as due today
    // regardless of the host's UTC offset.
    expect(daysUntilDue(makeSub({ nextDueDate: '2026-07-05' }))).toBe(0)
  })
})

describe('isDue / isDueSoon', () => {
  it('isDue is true when due today or overdue, and active', () => {
    expect(isDue(makeSub({ nextDueDate: '2026-07-05' }))).toBe(true)
    expect(isDue(makeSub({ nextDueDate: '2026-07-01' }))).toBe(true)
  })

  it('isDue is false when inactive even if overdue', () => {
    expect(isDue(makeSub({ nextDueDate: '2026-07-01', active: false }))).toBe(false)
  })

  it('isDue is false when due in the future', () => {
    expect(isDue(makeSub({ nextDueDate: '2026-07-06' }))).toBe(false)
  })

  it('isDueSoon is true within the next 7 days, inclusive of today', () => {
    expect(isDueSoon(makeSub({ nextDueDate: '2026-07-10' }))).toBe(true)
    expect(isDueSoon(makeSub({ nextDueDate: '2026-07-05' }))).toBe(true)
    expect(isDueSoon(makeSub({ nextDueDate: '2026-07-13' }))).toBe(false)
  })
})

describe('isAlreadyLoggedThisCycle', () => {
  it('is true for a matching transaction inside the prior-cycle window', () => {
    const sub = makeSub({ nextDueDate: '2026-07-05', cadence: 'monthly' })
    const tx = makeTx({ subscriptionId: 'sub-1', date: '2026-06-20' })
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(true)
  })

  it('is false when the transaction belongs to a different subscription', () => {
    const sub = makeSub({ nextDueDate: '2026-07-05' })
    const tx = makeTx({ subscriptionId: 'other-sub', date: '2026-06-20' })
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(false)
  })

  it('is false when the transaction is outside the window', () => {
    const sub = makeSub({ nextDueDate: '2026-07-05', cadence: 'monthly' })
    const tx = makeTx({ subscriptionId: 'sub-1', date: '2026-05-01' })
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(false)
  })

  it('handles the yearly cadence window', () => {
    const sub = makeSub({ nextDueDate: '2026-07-05', cadence: 'yearly' })
    const tx = makeTx({ subscriptionId: 'sub-1', date: '2026-01-15' })
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(true)
  })
})

describe('buildNextDueDate', () => {
  it('monthly: returns this month if the day has not passed yet', () => {
    expect(buildNextDueDate(20, 1, 'monthly')).toBe('2026-07-20')
  })

  it('monthly: rolls to next month if the day already passed', () => {
    expect(buildNextDueDate(1, 1, 'monthly')).toBe('2026-08-01')
  })

  it('monthly: today counts as already passed', () => {
    expect(buildNextDueDate(5, 1, 'monthly')).toBe('2026-08-05')
  })

  it('yearly: returns this year if the date has not passed yet', () => {
    expect(buildNextDueDate(1, 12, 'yearly')).toBe('2026-12-01')
  })

  it('yearly: rolls to next year if the date already passed', () => {
    expect(buildNextDueDate(1, 1, 'yearly')).toBe('2027-01-01')
  })
})
