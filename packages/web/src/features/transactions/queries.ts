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

type TransactionQueryKey = ['transactions', string | undefined]

type TransactionMutationContext = {
  previousTransactions: Transaction[] | undefined
}

function getTransactionsQueryKey(userId: string | undefined): TransactionQueryKey {
  return ['transactions', userId]
}

function createOptimisticTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...transaction,
  }
}

export function useTransactions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: getTransactionsQueryKey(user?.id),
    queryFn: fetchTransactions,
    enabled: !!user,
  })
}

export function useAddTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id)
  return useMutation({
    mutationFn: (transaction: Omit<Transaction, 'id'>) => insertTransaction(transaction),
    onMutate: async (transaction): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      qc.setQueryData<Transaction[]>(queryKey, (current = []) => [
        createOptimisticTransaction(transaction),
        ...current,
      ])
      return { previousTransactions }
    },
    onError: (_error, _transaction, context) => {
      qc.setQueryData(queryKey, context?.previousTransactions)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id)
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Transaction> }) => patchTransaction(id, patch),
    onMutate: async ({ id, patch }): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      qc.setQueryData<Transaction[]>(queryKey, (current = []) =>
        current.map((transaction) =>
          transaction.id === id ? { ...transaction, ...patch } : transaction,
        ),
      )
      return { previousTransactions }
    },
    onError: (_error, _variables, context) => {
      qc.setQueryData(queryKey, context?.previousTransactions)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}

export function useDeleteTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id)
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (id): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      qc.setQueryData<Transaction[]>(queryKey, (current = []) =>
        current.filter((transaction) => transaction.id !== id),
      )
      return { previousTransactions }
    },
    onError: (_error, _id, context) => {
      qc.setQueryData(queryKey, context?.previousTransactions)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}

export function useDeleteTransactions() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteTransactions(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: getTransactionsQueryKey(user?.id) }),
  })
}
