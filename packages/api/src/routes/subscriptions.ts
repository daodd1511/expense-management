import { Hono } from 'hono'
import {
  advanceNextDueDate,
  fromSubscription,
  fromTransaction,
  subscriptionCreateSchema,
  subscriptionPatchSchema,
  subscriptionPatchToRow,
  subscriptionRowSchema,
  toSubscription,
} from '@wallet/shared'
import { getSupabase } from '../db/supabase'
import { jsonError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

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
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: parseRows(data, subscriptionRowSchema, toSubscription) })
})

subscriptionsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, subscriptionCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(fromSubscription({ subscription: parsed.data, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    return jsonError(c, 500, error.message)
  }

  const subscription = subscriptionRowSchema.safeParse(data)
  if (!subscription.success) {
    return jsonError(c, 500, 'Inserted subscription failed validation', subscription.error.flatten())
  }

  return c.json({ data: toSubscription(subscription.data) }, 201)
})

subscriptionsRouter.post('/:id/log', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  const subscription = subscriptionRowSchema.safeParse(data)
  if (!subscription.success) {
    return jsonError(c, 500, 'Stored subscription failed validation', subscription.error.flatten())
  }

  const domainSubscription = toSubscription(subscription.data)
  const txInsert = await supabase
    .from('transactions')
    .insert(
      fromTransaction({
        transaction: {
          type: domainSubscription.type,
          amount: domainSubscription.amount,
          categoryId: domainSubscription.categoryId,
          accountId: domainSubscription.accountId,
          toAccountId: null,
          merchant: domainSubscription.name,
          note: domainSubscription.note,
          date: new Date().toISOString().slice(0, 10),
          receipt: null,
          subscriptionId: domainSubscription.id,
        },
        ownerId: userId,
      }),
    )
  if (txInsert.error) {
    return jsonError(c, 500, txInsert.error.message)
  }

  const nextDueDate = advanceNextDueDate(domainSubscription)
  const update = await supabase
    .from('subscriptions')
    .update({ next_due_date: nextDueDate })
    .eq('id', domainSubscription.id)
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (update.error) {
    return jsonError(c, 500, update.error.message)
  }
  if (!update.data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  const updated = subscriptionRowSchema.safeParse(update.data)
  if (!updated.success) {
    return jsonError(c, 500, 'Updated subscription failed validation', updated.error.flatten())
  }

  return c.json({ data: toSubscription(updated.data) })
})

subscriptionsRouter.patch('/:id', async (c) => {
  const parsed = await parseJsonBody(c, subscriptionPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .update(subscriptionPatchToRow(parsed.data))
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
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
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Subscription not found')
  }

  return c.json({ ok: true })
})
