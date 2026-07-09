import { describe, expect, it } from 'vitest'
import { computeBalance, computeBalanceTrend, computeRunningBalances } from './finance'
import type { Transaction } from './models'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    categoryId: null,
    accountId: 'acc-1',
    merchant: 'Merchant',
    date: '2026-07-05',
    ...overrides,
  }
}

describe('computeBalance', () => {
  it('starts from the opening balance', () => {
    expect(computeBalance('acc-1', [], 1000)).toBe(1000)
  })

  it('adds income and subtracts expense for the matching account', () => {
    const balance = computeBalance(
      'acc-1',
      [
        makeTx({ type: 'income', amount: 500, accountId: 'acc-1' }),
        makeTx({ type: 'expense', amount: 200, accountId: 'acc-1' }),
      ],
      1000,
    )
    expect(balance).toBe(1300)
  })

  it('ignores transactions on other accounts', () => {
    expect(computeBalance('acc-1', [makeTx({ type: 'income', amount: 500, accountId: 'acc-2' })], 1000)).toBe(1000)
  })

  it('handles transfer in and out for the matching account', () => {
    const balance = computeBalance(
      'acc-1',
      [
        makeTx({ type: 'transfer', amount: 100, accountId: 'acc-1', toAccountId: 'acc-2' }),
        makeTx({ type: 'transfer', amount: 50, accountId: 'acc-2', toAccountId: 'acc-1' }),
      ],
      1000,
    )
    expect(balance).toBe(1000 - 100 + 50)
  })
})

describe('computeRunningBalances', () => {
  it('tracks account-specific balanceAfter values in ledger order', () => {
    const balances = computeRunningBalances(
      [
        makeTx({ id: 'tx-1', type: 'income', amount: 500, accountId: 'cash' }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 200, accountId: 'cash' }),
        makeTx({ id: 'tx-3', type: 'income', amount: 100, accountId: 'bank' }),
      ],
      { cash: 1000, bank: 50 },
    )

    expect(balances.map((tx) => ({ id: tx.id, balanceAfter: tx.balanceAfter }))).toEqual([
      { id: 'tx-1', balanceAfter: 1500 },
      { id: 'tx-2', balanceAfter: 1300 },
      { id: 'tx-3', balanceAfter: 150 },
    ])
  })

  it('uses input order for same-day transactions so callers can control time ordering', () => {
    const balances = computeRunningBalances(
      [
        makeTx({ id: 'late', type: 'expense', amount: 400, accountId: 'cash', time: '18:00' }),
        makeTx({ id: 'early', type: 'income', amount: 100, accountId: 'cash', time: '08:00' }),
      ],
      { cash: 1000 },
    )

    expect(balances.map((tx) => ({ id: tx.id, balanceAfter: tx.balanceAfter }))).toEqual([
      { id: 'late', balanceAfter: 600 },
      { id: 'early', balanceAfter: 700 },
    ])
  })

  it('updates both source and destination balances for transfers but exposes the source account balanceAfter', () => {
    const balances = computeRunningBalances(
      [
        makeTx({ id: 'transfer', type: 'transfer', amount: 250, accountId: 'cash', toAccountId: 'bank' }),
        makeTx({ id: 'bank-expense', type: 'expense', amount: 50, accountId: 'bank' }),
      ],
      { cash: 1000, bank: 200 },
    )

    expect(balances.map((tx) => ({ id: tx.id, balanceAfter: tx.balanceAfter }))).toEqual([
      { id: 'transfer', balanceAfter: 750 },
      { id: 'bank-expense', balanceAfter: 400 },
    ])
  })
})

describe('computeBalanceTrend', () => {
  it('zero-fills months with no activity across the full window', () => {
    const points = computeBalanceTrend([], 1000, '2026-07', 6)
    expect(points).toEqual([
      { month: '2026-02', balance: 1000 },
      { month: '2026-03', balance: 1000 },
      { month: '2026-04', balance: 1000 },
      { month: '2026-05', balance: 1000 },
      { month: '2026-06', balance: 1000 },
      { month: '2026-07', balance: 1000 },
    ])
  })

  it('accumulates income/expense month over month within the window', () => {
    const points = computeBalanceTrend(
      [
        makeTx({ type: 'income', amount: 500, date: '2026-06-10' }),
        makeTx({ type: 'expense', amount: 200, date: '2026-07-01' }),
      ],
      1000,
      '2026-07',
      3,
    )
    expect(points).toEqual([
      { month: '2026-05', balance: 1000 },
      { month: '2026-06', balance: 1500 },
      { month: '2026-07', balance: 1300 },
    ])
  })

  it('folds activity before the window into the starting point instead of dropping it', () => {
    const points = computeBalanceTrend(
      [makeTx({ type: 'income', amount: 5000, date: '2020-01-15' })],
      1000,
      '2026-07',
      3,
    )
    expect(points[0]).toEqual({ month: '2026-05', balance: 6000 })
    expect(points[2]).toEqual({ month: '2026-07', balance: 6000 })
  })

  it('excludes transfers from the net worth figure', () => {
    const points = computeBalanceTrend(
      [makeTx({ type: 'transfer', amount: 999, date: '2026-07-01', toAccountId: 'acc-2' })],
      1000,
      '2026-07',
      1,
    )
    expect(points).toEqual([{ month: '2026-07', balance: 1000 }])
  })

  it('produces exactly monthsBack points regardless of how many months have data', () => {
    const manyMonths: Transaction[] = []
    for (let i = 0; i < 20; i++) {
      const month = String(1 + (i % 12)).padStart(2, '0')
      manyMonths.push(makeTx({ type: 'income', amount: 10, date: `202${i < 12 ? 4 : 5}-${month}-01` }))
    }
    const points = computeBalanceTrend(manyMonths, 0, '2026-07', 6)
    expect(points).toHaveLength(6)
  })
})
