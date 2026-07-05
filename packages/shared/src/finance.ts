import type { BalanceTrendPoint } from './dtos'
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

function shiftMonth(monthIso: string, delta: number): string {
  const [year, month] = monthIso.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Cumulative net worth at the end of each of the trailing `monthsBack` months (inclusive of
 * `referenceMonth`), zero-filled for months with no activity. `startingBalance` is the sum
 * of every account's opening balance; each month's net (income − expense) is added on top,
 * carrying forward all history before the window into the first point. Transfers are
 * excluded — they move money between the same owner's accounts, so they net to zero for a
 * total-net-worth figure. `referenceMonth` is caller-supplied (`YYYY-MM`) rather than read
 * from the server's own clock, since "today" is a local-calendar-date concept with no
 * per-user timezone stored.
 */
export function computeBalanceTrend(
  transactions: Transaction[],
  startingBalance: number,
  referenceMonth: string,
  monthsBack = 6,
): BalanceTrendPoint[] {
  const months: string[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(shiftMonth(referenceMonth, -i))
  }

  const netByMonth = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type === 'transfer') continue
    const month = tx.date.slice(0, 7)
    const delta = tx.type === 'income' ? tx.amount : -tx.amount
    netByMonth.set(month, (netByMonth.get(month) ?? 0) + delta)
  }

  const earliestWindowMonth = months[0]
  let runningBalance = startingBalance
  for (const [month, net] of netByMonth) {
    if (month < earliestWindowMonth) runningBalance += net
  }

  return months.map((month) => {
    runningBalance += netByMonth.get(month) ?? 0
    return { month, balance: runningBalance }
  })
}
