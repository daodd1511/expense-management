import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import {
  deleteTransaction,
  deleteTransactions,
  fetchTransactions,
  insertTransaction,
  patchTransaction,
} from '@/features/transactions/db'
import type { Transaction } from '@/core/types'

export function useTransactions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    enabled: !!user,
  })
}

export function useAddTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transaction: Omit<Transaction, 'id'>) => insertTransaction(transaction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Transaction> }) => patchTransaction(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useDeleteTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useDeleteTransactions() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteTransactions(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}
