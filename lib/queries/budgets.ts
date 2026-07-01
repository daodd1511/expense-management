import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/lib/types'
import type { Database } from '@/lib/database.types'

type BudgetRow = Database['public']['Tables']['budgets']['Row']

function toBudget(row: BudgetRow): Budget {
  return { categoryId: row.category_id, limit: row.amount }
}

export function useBudgets() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(toBudget)
    },
    enabled: !!user,
  })
}

export function useAddBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (b: Budget) => {
      const { error } = await supabase.from('budgets').insert({
        owner_id: user!.id,
        category_id: b.categoryId,
        amount: b.limit,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}

export function useUpdateBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, limit }: Budget) => {
      const { error } = await supabase
        .from('budgets')
        .update({ amount: limit })
        .eq('category_id', categoryId)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}

export function useDeleteBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('category_id', categoryId)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}
