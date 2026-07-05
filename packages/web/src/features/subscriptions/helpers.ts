import { buildNextDueDate as buildNextDueDateShared } from '@wallet/shared'
import { diffDays, parseLocalDate, todayLocalIso } from '@/shared/lib/date'
import type { Subscription, SubscriptionCadence, Transaction } from '@/core/types'

export function monthlyEquivalent(s: Subscription): number {
  return s.cadence === 'yearly' ? Math.round(s.amount / 12) : s.amount
}

export function totalMonthlyCost(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + monthlyEquivalent(s), 0)
}

export function daysUntilDue(sub: Subscription): number {
  return diffDays(sub.nextDueDate, todayLocalIso())
}

export function isDue(sub: Subscription): boolean {
  return sub.active && daysUntilDue(sub) <= 0
}

export function isDueSoon(sub: Subscription): boolean {
  const days = daysUntilDue(sub)
  return sub.active && days >= 0 && days <= 7
}

export function isAlreadyLoggedThisCycle(sub: Subscription, transactions: Transaction[]): boolean {
  const due = parseLocalDate(sub.nextDueDate)
  // Check prev cycle window: from (nextDue - cadenceDays) to nextDue
  const windowStart = new Date(due)
  if (sub.cadence === 'monthly') windowStart.setMonth(windowStart.getMonth() - 1)
  else windowStart.setFullYear(windowStart.getFullYear() - 1)

  return transactions.some((tx) => {
    if (tx.subscriptionId !== sub.id) return false
    const txDate = parseLocalDate(tx.date)
    return txDate >= windowStart && txDate <= due
  })
}

export function dueBanner(
  subscriptions: Subscription[],
  transactions: Transaction[],
): Subscription[] {
  return subscriptions.filter(
    (s) => isDue(s) && !isAlreadyLoggedThisCycle(s, transactions),
  )
}

/**
 * Thin wrapper over the shared implementation (also used server-side to compute
 * `nextDueDate` authoritatively) — supplies "today" from the client's local clock, since
 * the caller-facing signature here has no `today` parameter of its own.
 */
export function buildNextDueDate(dayOfMonth: number, monthOfYear: number, cadence: SubscriptionCadence): string {
  return buildNextDueDateShared(dayOfMonth, monthOfYear, cadence, todayLocalIso())
}
