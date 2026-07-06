import { Hono } from 'hono'
import { z } from 'zod'
import {
  advanceNextDueDate,
  buildNextDueDate,
  fromSubscription,
  isoDateSchema,
  subscriptionCreateSchema,
  subscriptionPatchSchema,
  subscriptionPatchToRow,
  subscriptionRowSchema,
  toSubscription,
  transactionRowSchema,
} from '@wallet/shared'
import { getSupabase } from '../config/supabase'
import { jsonError, mapDbError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

const logSubscriptionBodySchema = z.object({ today: isoDateSchema })

/** Flat row shape returned by the `log_subscription` RPC (prefixed tx_/sub_ columns). */
type LogSubscriptionRpcRow = {
  tx_id: string
  tx_owner_id: string
  tx_type: string
  tx_amount: number
  tx_category_id: string | null
  tx_account_id: string
  tx_to_account_id: string | null
  tx_merchant: string
  tx_note: string | null
  tx_tx_date: string
  tx_receipt_url: string | null
  tx_subscription_id: string | null
  tx_created_at: string
  sub_id: string
  sub_owner_id: string
  sub_name: string
  sub_amount: number
  sub_type: string
  sub_category_id: string | null
  sub_account_id: string
  sub_cadence: string
  sub_day_of_month: number
  sub_month_of_year: number
  sub_next_due_date: string
  sub_note: string | null
  sub_active: boolean
  sub_created_at: string
}

export const subscriptionsRouter = new Hono<AuthEnv>()

subscriptionsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return mapDbError(c, error)
  }

  return c.json({ data: parseRows(data, subscriptionRowSchema, toSubscription) })
})

subscriptionsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, subscriptionCreateSchema)
  if (!parsed.success) return parsed.response

  const { today, ...subscriptionInput } = parsed.data
  const nextDueDate = buildNextDueDate(
    subscriptionInput.dayOfMonth,
    subscriptionInput.monthOfYear,
    subscriptionInput.cadence,
    today,
  )

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(fromSubscription({ subscription: { ...subscriptionInput, nextDueDate }, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    return mapDbError(c, error)
  }

  const subscription = subscriptionRowSchema.safeParse(data)
  if (!subscription.success) {
    return jsonError(c, 500, 'Inserted subscription failed validation', subscription.error.flatten())
  }

  return c.json({ data: toSubscription(subscription.data) }, 201)
})

subscriptionsRouter.post('/:id/log', async (c) => {
  const parsed = await parseJsonBody(c, logSubscriptionBodySchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  const subscription = subscriptionRowSchema.safeParse(data)
  if (!subscription.success) {
    return jsonError(c, 500, 'Stored subscription failed validation', subscription.error.flatten())
  }

  const domainSubscription = toSubscription(subscription.data)
  const nextDueDate = advanceNextDueDate(domainSubscription)

  const rpc = await supabase
    .rpc('log_subscription', {
      p_owner_id: userId,
      p_subscription_id: domainSubscription.id,
      p_type: domainSubscription.type,
      p_amount: domainSubscription.amount,
      p_category_id: domainSubscription.categoryId,
      p_account_id: domainSubscription.accountId,
      p_merchant: domainSubscription.name,
      p_note: domainSubscription.note ?? null,
      p_tx_date: parsed.data.today,
      p_next_due_date: nextDueDate,
    })
    .single<LogSubscriptionRpcRow>()

  if (rpc.error) {
    return mapDbError(c, rpc.error)
  }
  if (!rpc.data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  const txRow = transactionRowSchema.safeParse({
    id: rpc.data.tx_id,
    owner_id: rpc.data.tx_owner_id,
    type: rpc.data.tx_type,
    amount: rpc.data.tx_amount,
    category_id: rpc.data.tx_category_id,
    account_id: rpc.data.tx_account_id,
    to_account_id: rpc.data.tx_to_account_id,
    merchant: rpc.data.tx_merchant,
    note: rpc.data.tx_note,
    tx_date: rpc.data.tx_tx_date,
    receipt_url: rpc.data.tx_receipt_url,
    subscription_id: rpc.data.tx_subscription_id,
    created_at: rpc.data.tx_created_at,
  })
  const subRow = subscriptionRowSchema.safeParse({
    id: rpc.data.sub_id,
    owner_id: rpc.data.sub_owner_id,
    name: rpc.data.sub_name,
    amount: rpc.data.sub_amount,
    type: rpc.data.sub_type,
    category_id: rpc.data.sub_category_id,
    account_id: rpc.data.sub_account_id,
    cadence: rpc.data.sub_cadence,
    day_of_month: rpc.data.sub_day_of_month,
    month_of_year: rpc.data.sub_month_of_year,
    next_due_date: rpc.data.sub_next_due_date,
    note: rpc.data.sub_note,
    active: rpc.data.sub_active,
    created_at: rpc.data.sub_created_at,
  })
  if (!txRow.success) {
    return jsonError(c, 500, 'Logged transaction failed validation', txRow.error.flatten())
  }
  if (!subRow.success) {
    return jsonError(c, 500, 'Updated subscription failed validation', subRow.error.flatten())
  }

  return c.json({ data: toSubscription(subRow.data) })
})

subscriptionsRouter.patch('/:id', async (c) => {
  const parsed = await parseJsonBody(c, subscriptionPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()

  const { today, ...patch } = parsed.data
  const scheduleChanged =
    patch.dayOfMonth !== undefined || patch.monthOfYear !== undefined || patch.cadence !== undefined

  const row: ReturnType<typeof subscriptionPatchToRow> & { next_due_date?: string } =
    subscriptionPatchToRow(patch)
  if (scheduleChanged) {
    // A partial schedule change (e.g. only dayOfMonth) still needs the other schedule
    // fields to compute the next occurrence, so fetch the current values to merge with.
    const current = await supabase
      .from('subscriptions')
      .select('day_of_month, month_of_year, cadence')
      .eq('id', c.req.param('id'))
      .eq('owner_id', userId)
      .maybeSingle()

    if (current.error) {
      return mapDbError(c, current.error)
    }
    if (!current.data) {
      return jsonError(c, 404, 'Subscription not found')
    }

    row.next_due_date = buildNextDueDate(
      patch.dayOfMonth ?? current.data.day_of_month,
      patch.monthOfYear ?? current.data.month_of_year,
      patch.cadence ?? (current.data.cadence as 'monthly' | 'yearly'),
      // schema's .refine guarantees `today` is present whenever a schedule field is
      today as string,
    )
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update(row)
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  const subscription = subscriptionRowSchema.safeParse(data)
  if (!subscription.success) {
    return jsonError(c, 500, 'Updated subscription failed validation', subscription.error.flatten())
  }

  return c.json({ data: toSubscription(subscription.data) })
})

subscriptionsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  return c.json({ ok: true })
})
