import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import {
  deleteSubscription,
  fetchSubscriptions,
  insertSubscription,
  logSubscription,
  patchSubscription,
} from '@/features/subscriptions/db'
import type { Subscription } from '@/core/types'

export function useSubscriptions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: () => fetchSubscriptions(user!.id),
    enabled: !!user,
  })
}

export function useAddSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (subscription: Omit<Subscription, 'id'>) => insertSubscription(subscription, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useUpdateSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Subscription, 'id'>> }) =>
      patchSubscription(id, patch, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useDeleteSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useLogSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (subscription: Subscription) => logSubscription(subscription, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', user?.id] })
      qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
    },
  })
}
