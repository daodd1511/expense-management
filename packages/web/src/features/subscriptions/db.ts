import { z } from 'zod'
import type { Subscription } from '@/core/types'
import { apiJson } from '@/core/api'
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
    body: JSON.stringify(subscription),
  })
}

export async function patchSubscription(
  id: string,
  patch: Partial<Omit<Subscription, 'id'>>,
): Promise<void> {
  await apiJson(`/subscriptions/${id}`, subscriptionResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(patch),
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
  })
}
