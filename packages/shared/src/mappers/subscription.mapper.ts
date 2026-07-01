import type { Subscription } from '../models'
import type { SubscriptionPatch, SubscriptionRow } from '../dtos'

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    accountId: row.account_id,
    cadence: row.cadence,
    dayOfMonth: row.day_of_month,
    monthOfYear: row.month_of_year,
    nextDueDate: row.next_due_date,
    note: row.note ?? undefined,
    active: row.active,
  }
}

export function fromSubscription(params: {
  subscription: Omit<Subscription, 'id'>
  ownerId: string
}) {
  const { subscription, ownerId } = params
  return {
    owner_id: ownerId,
    name: subscription.name,
    amount: subscription.amount,
    type: subscription.type,
    category_id: subscription.categoryId ?? null,
    account_id: subscription.accountId,
    cadence: subscription.cadence,
    day_of_month: subscription.dayOfMonth,
    month_of_year: subscription.monthOfYear,
    next_due_date: subscription.nextDueDate,
    note: subscription.note ?? null,
    active: subscription.active,
  }
}

export function subscriptionPatchToRow(patch: SubscriptionPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
    ...(patch.accountId !== undefined && { account_id: patch.accountId }),
    ...(patch.cadence !== undefined && { cadence: patch.cadence }),
    ...(patch.dayOfMonth !== undefined && { day_of_month: patch.dayOfMonth }),
    ...(patch.monthOfYear !== undefined && { month_of_year: patch.monthOfYear }),
    ...(patch.nextDueDate !== undefined && { next_due_date: patch.nextDueDate }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.active !== undefined && { active: patch.active }),
  }
}

export function advanceNextDueDate(subscription: Subscription): string {
  const nextDate = new Date(subscription.nextDueDate)
  if (subscription.cadence === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1)
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1)
  }
  return nextDate.toISOString().slice(0, 10)
}
