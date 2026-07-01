import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import {
  deleteCategory,
  fetchCategories,
  insertCategory,
  patchCategory,
} from '@/lib/db/categories'
import type { Category } from '@/lib/types'

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: () => fetchCategories(user!.id),
    enabled: !!user,
  })
}

export function useAddCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (category: Omit<Category, 'id'>) => insertCategory(category, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', user?.id] }),
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Category, 'id'>> }) =>
      patchCategory(id, patch, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', user?.id] }),
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', user?.id] })
      qc.invalidateQueries({ queryKey: ['transactions', user?.id] })
      qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
      qc.invalidateQueries({ queryKey: ['budgets', user?.id] })
    },
  })
}
