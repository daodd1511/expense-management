import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/lib/types'
import type { Database } from '@/lib/database.types'

type TxRow = Database['public']['Tables']['transactions']['Row']

function toTransaction(row: TxRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    merchant: row.merchant,
    note: row.note ?? undefined,
    date: row.date,
    receipt: row.receipt_url ?? undefined,
    subscriptionId: row.subscription_id,
  }
}

export function useTransactions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('owner_id', user!.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(toTransaction)
    },
    enabled: !!user,
  })
}

export function useAddTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Omit<Transaction, 'id'>) => {
      const { error } = await supabase.from('transactions').insert({
        owner_id: user!.id,
        type: t.type,
        amount: t.amount,
        category_id: t.categoryId,
        account_id: t.accountId,
        to_account_id: t.toAccountId ?? null,
        merchant: t.merchant,
        note: t.note ?? null,
        date: t.date,
        receipt_url: t.receipt ?? null,
        subscription_id: t.subscriptionId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Transaction> }) => {
      const { error } = await supabase
        .from('transactions')
        .update({
          ...(patch.type !== undefined && { type: patch.type }),
          ...(patch.amount !== undefined && { amount: patch.amount }),
          ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
          ...(patch.accountId !== undefined && { account_id: patch.accountId }),
          ...(patch.toAccountId !== undefined && { to_account_id: patch.toAccountId }),
          ...(patch.merchant !== undefined && { merchant: patch.merchant }),
          ...(patch.note !== undefined && { note: patch.note }),
          ...(patch.date !== undefined && { date: patch.date }),
          ...(patch.receipt !== undefined && { receipt_url: patch.receipt }),
        })
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useDeleteTransaction() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}

export function useDeleteTransactions() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', user?.id] }),
  })
}
