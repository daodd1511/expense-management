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
import type { TransactionCreate, TransactionPatch } from '@wallet/shared'

type TransactionQueryKey = ['transactions', string | undefined, string]

type TransactionMutationContext = {
  previousTransactions: Transaction[] | undefined
}

function getTransactionsQueryKey(userId: string | undefined, month: string): TransactionQueryKey {
  return ['transactions', userId, month]
}

function createOptimisticTransaction(transaction: TransactionCreate): Transaction {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...transaction,
  }
}

function applyOptimisticPatch(transaction: Transaction, patch: TransactionPatch): Transaction {
  const normalizedPatch: Partial<Transaction> = {
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
    ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
    ...(patch.accountId !== undefined && { accountId: patch.accountId }),
    ...(patch.toAccountId !== undefined && { toAccountId: patch.toAccountId }),
    ...(patch.merchant !== undefined && { merchant: patch.merchant }),
    ...(patch.note !== undefined && { note: patch.note ?? undefined }),
    ...(patch.date !== undefined && { date: patch.date }),
    ...(patch.time !== undefined && { time: patch.time ?? undefined }),
    ...(patch.receipt !== undefined && { receipt: patch.receipt }),
  }

  return {
    ...transaction,
    ...normalizedPatch,
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
    mutationFn: (transaction: TransactionCreate) => insertTransaction(transaction),
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
    mutationFn: ({ id, patch }: { id: string; patch: TransactionPatch }) => patchTransaction(id, patch),
    onMutate: async ({ id, patch }): Promise<TransactionMutationContext> => {
      await qc.cancelQueries({ queryKey })
      const previousTransactions = qc.getQueryData<Transaction[]>(queryKey)
      qc.setQueryData<Transaction[]>(queryKey, (current = []) =>
        current.map((transaction) =>
          transaction.id === id
            ? applyOptimisticPatch(transaction, patch)
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
