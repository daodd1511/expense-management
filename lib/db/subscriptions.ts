import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Subscription } from '@/lib/types'
import { secureParse } from './secure-parse'

// ---- DTO schema ----

const subscriptionRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(['expense', 'income']),
  category_id: z.string().nullable(),
  account_id: z.string(),
  cadence: z.enum(['monthly', 'yearly']),
  day_of_month: z.number(),
  month_of_year: z.number(),
  next_due_date: z.string(),
  note: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
})

type SubscriptionRow = z.infer<typeof subscriptionRowSchema>

// ---- Mapper ----

function toSubscription(row: SubscriptionRow): Subscription {
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

function fromSubscription(s: Omit<Subscription, 'id'>, ownerId: string) {
  return {
    owner_id: ownerId,
    name: s.name,
    amount: s.amount,
    type: s.type,
    category_id: s.categoryId ?? null,
    account_id: s.accountId,
    cadence: s.cadence,
    day_of_month: s.dayOfMonth,
    month_of_year: s.monthOfYear,
    next_due_date: s.nextDueDate,
    note: s.note ?? null,
    active: s.active,
  }
}

function advanceNextDueDate(s: Subscription): string {
  const d = new Date(s.nextDueDate)
  if (s.cadence === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

// ---- Repository ----

export async function fetchSubscriptions(ownerId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .map((row) => secureParse(subscriptionRowSchema, row))
    .filter((s): s is SubscriptionRow => s !== null)
    .map(toSubscription)
}

export async function insertSubscription(subscription: Omit<Subscription, 'id'>, ownerId: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').insert(fromSubscription(subscription, ownerId))
  if (error) throw error
}

export async function patchSubscription(
  id: string,
  patch: Partial<Omit<Subscription, 'id'>>,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
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
    })
    .eq('id', id)
    .eq('owner_id', ownerId)
  if (error) throw error
}

export async function deleteSubscription(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) throw error
}

export async function logSubscription(subscription: Subscription, ownerId: string): Promise<void> {
  const { error: txError } = await supabase.from('transactions').insert({
    owner_id: ownerId,
    type: subscription.type,
    amount: subscription.amount,
    category_id: subscription.categoryId ?? null,
    account_id: subscription.accountId,
    to_account_id: null,
    merchant: subscription.name,
    note: subscription.note ?? null,
    tx_date: new Date().toISOString().slice(0, 10),
    receipt_url: null,
    subscription_id: subscription.id,
  })
  if (txError) throw txError

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ next_due_date: advanceNextDueDate(subscription) })
    .eq('id', subscription.id)
    .eq('owner_id', ownerId)
  if (subError) throw subError
}
