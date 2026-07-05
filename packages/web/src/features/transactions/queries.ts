import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import {
  deleteTransaction,
  deleteTransactions,
  fetchTransactions,
  insertTransaction,
  patchTransaction,
} from '@/features/transactions/db'
import { todayLocalMonthIso } from '@/shared/lib/date'
import type { Transaction } from '@/core/types'

type TransactionQueryKey = ['transactions', string | undefined, string]

type TransactionMutationContext = {
  previousTransactions: Transaction[] | undefined
}

function getTransactionsQueryKey(userId: string | undefined, month: string): TransactionQueryKey {
  return ['transactions', userId, month]
}

function createOptimisticTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...transaction,
  }
}

export function useTransactions(month: string = todayLocalMonthIso()) {
  const { user } = useAuth()
  return useQuery({
    queryKey: getTransactionsQueryKey(user?.id, month),
    queryFn: () => fetchTransactions(month),
    enabled: !!user,
  })
}

export function useAddTransaction(month: string = todayLocalMonthIso()) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id, month)
  return useMutation({
    mutationFn: (transaction: Omit<Transaction, 'id'>) => insertTransaction(transaction),
    onMutate: async (transaction): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      if (transaction.date.slice(0, 7) === month) {
        qc.setQueryData<Transaction[]>(queryKey, (current = []) => [
          createOptimisticTransaction(transaction),
          ...current,
        ])
      }
      return { previousTransactions }
    },
    onError: (_error, _transaction, context) => {
      qc.setQueryData(queryKey, context?.previousTransactions)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useUpdateTransaction(month: string = todayLocalMonthIso()) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id, month)
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Transaction> }) => patchTransaction(id, patch),
    onMutate: async ({ id, patch }): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      qc.setQueryData<Transaction[]>(queryKey, (current = []) =>
        current.map((transaction) =>
          transaction.id === id
            ? { ...transaction, ...patch }
            : transaction,
        ),
      )
      qc.setQueryData<Transaction[]>(queryKey, (current = []) =>
        current.filter((transaction) => transaction.date.slice(0, 7) === month),
      )
      return { previousTransactions }
    },
    onError: (_error, _variables, context) => {
      qc.setQueryData(queryKey, context?.previousTransactions)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useDeleteTransaction(month: string = todayLocalMonthIso()) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const queryKey = getTransactionsQueryKey(user?.id, month)
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
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
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
