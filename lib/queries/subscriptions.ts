import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Subscription, Transaction } from '@/lib/types'
import type { Database } from '@/lib/database.types'

type SubRow = Database['public']['Tables']['subscriptions']['Row']

function toSubscription(row: SubRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    accountId: row.account_id,
    cadence: row.cadence,
    dayOfMonth: row.day_of_month,
    monthOfYear: row.month_of_year,
    nextDueDate: row.next_due_date,
    note: row.note ?? undefined,
    active: row.active,
  }
}

function advanceNextDueDate(s: Subscription): string {
  const d = new Date(s.nextDueDate)
  if (s.cadence === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function useSubscriptions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(toSubscription)
    },
    enabled: !!user,
  })
}

export function useAddSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: Omit<Subscription, 'id'>) => {
      const { error } = await supabase.from('subscriptions').insert({
        owner_id: user!.id,
        name: s.name,
        amount: s.amount,
        type: s.type,
        category_id: s.categoryId,
        account_id: s.accountId,
        cadence: s.cadence,
        day_of_month: s.dayOfMonth,
        month_of_year: s.monthOfYear,
        next_due_date: s.nextDueDate,
        note: s.note ?? null,
        active: s.active,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useUpdateSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<Subscription, 'id'>> }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.amount !== undefined && { amount: patch.amount }),
          ...(patch.type !== undefined && { type: patch.type }),
          ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
          ...(patch.accountId !== undefined && { account_id: patch.accountId }),
          ...(patch.cadence !== undefined && { cadence: patch.cadence }),
          ...(patch.dayOfMonth !== undefined && { day_of_month: patch.dayOfMonth }),
          ...(patch.monthOfYear !== undefined && { month_of_year: patch.monthOfYear }),
          ...(patch.nextDueDate !== undefined && { next_due_date: patch.nextDueDate }),
          ...(patch.note !== undefined && { note: patch.note }),
          ...(patch.active !== undefined && { active: patch.active }),
        })
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useDeleteSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
  })
}

export function useLogSubscription() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sub: Subscription) => {
      const tx: Omit<Transaction, 'id'> & { owner_id: string } = {
        owner_id: user!.id,
        type: sub.type,
        amount: sub.amount,
        categoryId: sub.categoryId,
        accountId: sub.accountId,
        merchant: sub.name,
        note: sub.note,
        date: new Date().toISOString().slice(0, 10),
        subscriptionId: sub.id,
      }
      const { error: txError } = await supabase.from('transactions').insert({
        owner_id: tx.owner_id,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.categoryId,
        account_id: tx.accountId,
        merchant: tx.merchant,
        note: tx.note ?? null,
        date: tx.date,
        subscription_id: tx.subscriptionId ?? null,
        to_account_id: null,
        receipt_url: null,
      })
      if (txError) throw txError

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ next_due_date: advanceNextDueDate(sub) })
        .eq('id', sub.id)
        .eq('owner_id', user!.id)
      if (subError) throw subError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', user?.id] })
      qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
    },
  })
}
