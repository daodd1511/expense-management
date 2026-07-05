import { z } from 'zod'
import type { Subscription } from '@/core/types'
import { apiJson } from '@/core/api'
import { todayLocalIso } from '@/shared/lib/date'
import { subscriptionSchema } from '@wallet/shared'

const subscriptionsResponseSchema = z.object({
  data: z.array(subscriptionSchema),
})

const subscriptionResponseSchema = z.object({
  data: subscriptionSchema,
})

const okResponseSchema = z.object({
  ok: z.literal(true),
})

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const response = await apiJson('/subscriptions', subscriptionsResponseSchema)
  return response.data
}

export async function insertSubscription(subscription: Omit<Subscription, 'id'>): Promise<void> {
  await apiJson('/subscriptions', subscriptionResponseSchema, {
    method: 'POST',
    // nextDueDate is always server-computed (buildNextDueDate) from `today`, the caller's
    // local calendar date — the server has no per-user timezone to derive "today" itself.
    body: JSON.stringify({ ...subscription, today: todayLocalIso() }),
  })
}

export async function patchSubscription(
  id: string,
  patch: Partial<Omit<Subscription, 'id'>>,
): Promise<void> {
  await apiJson(`/subscriptions/${id}`, subscriptionResponseSchema, {
    method: 'PATCH',
    // Only used server-side when the patch also changes dayOfMonth/monthOfYear/cadence;
    // harmless to always include otherwise.
    body: JSON.stringify({ ...patch, today: todayLocalIso() }),
  })
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiJson(`/subscriptions/${id}`, okResponseSchema, {
    method: 'DELETE',
  })
}

export async function logSubscription(subscription: Subscription): Promise<void> {
  await apiJson(`/subscriptions/${subscription.id}/log`, subscriptionResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ today: todayLocalIso() }),
  })
}
