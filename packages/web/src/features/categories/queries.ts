import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import { invalidateCategoryDependentQueries } from '@/core/query-invalidation'
import {
  deleteCategory,
  fetchCategories,
  insertCategory,
  patchCategory,
} from '@/features/categories/db'
import type { Category } from '@/core/types'

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: fetchCategories,
    enabled: !!user,
  })
}

/** Category id → Category lookup, memoized over the current categories list. */
export function useCategoryLookup(): (id: string | null | undefined) => Category | undefined {
  const { data: categories = [] } = useCategories()
  return useMemo(() => {
    const map = new Map(categories.map((category) => [category.id, category]))
    return (id: string | null | undefined) => (id ? map.get(id) : undefined)
  }, [categories])
}

export function useAddCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      category: Pick<Category, 'name' | 'icon' | 'color' | 'type'> & Partial<Pick<Category, 'parentId'>>,
    ) => insertCategory(category),
    onSuccess: () => invalidateCategoryDependentQueries(qc, user?.id),
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId'>>
    }) => patchCategory(id, patch),
    onSuccess: () => invalidateCategoryDependentQueries(qc, user?.id),
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidateCategoryDependentQueries(qc, user?.id),
  })
}
