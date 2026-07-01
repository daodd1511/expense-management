import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import { archiveAccount, fetchAccounts, insertAccount, patchAccount } from '@/features/accounts/db'
import type { Account } from '@/core/types'

export function useAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
  })
}

export function useAddAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (account: Omit<Account, 'id'>) => insertAccount(account),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useUpdateAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Account, 'id'>> }) => patchAccount(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useDeleteAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}
