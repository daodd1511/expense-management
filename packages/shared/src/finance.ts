import type { MonthlyTotal } from './dtos'
import type { Transaction } from './models'

/** Computed balance = opening balance + all income - all expenses ± transfers. */
export function computeBalance(accountId: string, transactions: Transaction[], openingBalance: number): number {
  let balance = openingBalance
  for (const tx of transactions) {
    if (tx.type === 'income' && tx.accountId === accountId) balance += tx.amount
    else if (tx.type === 'expense' && tx.accountId === accountId) balance -= tx.amount
    else if (tx.type === 'transfer') {
      if (tx.accountId === accountId) balance -= tx.amount
      if (tx.toAccountId === accountId) balance += tx.amount
    }
  }
  return balance
}

/** Aggregates month buckets in ascending order using transaction date strings (`YYYY-MM-DD`). */
export function aggregateMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const totals = new Map<string, { income: number; expense: number }>()

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7)
    const entry = totals.get(month) ?? { income: 0, expense: 0 }
    if (tx.type === 'income') entry.income += tx.amount
    else if (tx.type === 'expense') entry.expense += tx.amount
    totals.set(month, entry)
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      income: total.income,
      expense: total.expense,
    }))
}
