import { colorVar } from '@/shared/components/CategoryIcon'
import type { DonutDatum } from '@/shared/components/Charts'
import { isSameLocalMonth } from '@/shared/lib/date'
import type { Category, Transaction } from '@/core/types'

function inCurrentMonth(iso: string): boolean {
  return isSameLocalMonth(iso)
}

export function monthSummary(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!inCurrentMonth(t.date)) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function expenseByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !inCurrentMonth(t.date) || !t.categoryId) continue
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
  }
  return map
}

export function spentForCategory(transactions: Transaction[], categoryId: string) {
  let total = 0
  for (const t of transactions) {
    if (t.type === 'expense' && t.categoryId === categoryId && inCurrentMonth(t.date)) {
      total += t.amount
    }
  }
  return total
}

/** Computed balance = opening balance + all income - all expenses ± transfers */
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

export function buildDonutData(
  transactions: Transaction[],
  getCategory: (id: string | null | undefined) => Category | undefined,
): { data: DonutDatum[]; total: number } {
  const map = expenseByCategory(transactions)
  const data: DonutDatum[] = [...map.entries()]
    .map(([catId, value]) => {
      const cat = getCategory(catId)
      return { id: catId, name: cat?.name ?? 'Khác', value, color: colorVar(cat?.color ?? 'chart-1') }
    })
    .sort((a, b) => b.value - a.value)
  const total = data.reduce((s, d) => s + d.value, 0)
  return { data, total }
}
