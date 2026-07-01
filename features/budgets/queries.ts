import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { deleteBudget, fetchBudgets, insertBudget, updateBudget } from '@/lib/db/budgets'
import type { Budget } from '@/lib/types'

export function useBudgets() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: () => fetchBudgets(user!.id),
    enabled: !!user,
  })
}

export function useAddBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (budget: Budget) => insertBudget(budget, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}

export function useUpdateBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, limit }: Budget) => updateBudget(categoryId, limit, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}

export function useDeleteBudget() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: string) => deleteBudget(categoryId, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] }),
  })
}
