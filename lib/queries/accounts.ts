import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { archiveAccount, fetchAccounts, insertAccount, patchAccount } from '@/lib/db/accounts'
import type { Account } from '@/lib/types'

export function useAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: () => fetchAccounts(user!.id),
    enabled: !!user,
  })
}

export function useAddAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (account: Omit<Account, 'id'>) => insertAccount(account, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useUpdateAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Account, 'id'>> }) =>
      patchAccount(id, patch, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useDeleteAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}
