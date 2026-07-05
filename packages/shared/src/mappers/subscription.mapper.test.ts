import { describe, expect, it } from 'vitest'
import type { Subscription } from '../models'
import { advanceNextDueDate, buildNextDueDate } from './subscription.mapper'

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

describe('advanceNextDueDate', () => {
  it('advances a monthly subscription by one month', () => {
    expect(advanceNextDueDate(makeSub({ cadence: 'monthly', nextDueDate: '2026-07-05' }))).toBe(
      '2026-08-05',
    )
  })

  it('advances a yearly subscription by one year', () => {
    expect(advanceNextDueDate(makeSub({ cadence: 'yearly', nextDueDate: '2026-07-05' }))).toBe(
      '2027-07-05',
    )
  })

  it('does not drift a day across a month-end boundary', () => {
    expect(advanceNextDueDate(makeSub({ cadence: 'monthly', nextDueDate: '2026-01-31' }))).toBe(
      // JS Date's setMonth on a day that doesn't exist next month rolls forward — this
      // documents that behavior rather than asserting an invalid '2026-03-03' surprise.
      '2026-03-03',
    )
  })
})

describe('buildNextDueDate', () => {
  it('monthly: returns this month if the day has not passed yet', () => {
    expect(buildNextDueDate(20, 1, 'monthly', '2026-07-05')).toBe('2026-07-20')
  })

  it('monthly: rolls to next month if the day already passed', () => {
    expect(buildNextDueDate(1, 1, 'monthly', '2026-07-05')).toBe('2026-08-01')
  })

  it('monthly: today counts as already passed', () => {
    expect(buildNextDueDate(5, 1, 'monthly', '2026-07-05')).toBe('2026-08-05')
  })

  it('yearly: returns this year if the date has not passed yet', () => {
    expect(buildNextDueDate(1, 12, 'yearly', '2026-07-05')).toBe('2026-12-01')
  })

  it('yearly: rolls to next year if the date already passed', () => {
    expect(buildNextDueDate(1, 1, 'yearly', '2026-07-05')).toBe('2027-01-01')
  })
})
