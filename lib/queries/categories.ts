import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'
import type { Database } from '@/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon, color: row.color }
}

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`owner_id.eq.${user!.id},owner_id.is.null`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(toCategory)
    },
    enabled: !!user,
  })
}

export function useAddCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Omit<Category, 'id'>) => {
      const { error } = await supabase.from('categories').insert({
        owner_id: user!.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', user?.id] }),
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<Category, 'id'>> }) => {
      const { error } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', user?.id] }),
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Null out FK references before deleting
      await supabase
        .from('transactions')
        .update({ category_id: null })
        .eq('category_id', id)
        .eq('owner_id', user!.id)
      await supabase
        .from('subscriptions')
        .update({ category_id: null })
        .eq('category_id', id)
        .eq('owner_id', user!.id)
      await supabase
        .from('budgets')
        .delete()
        .eq('category_id', id)
        .eq('owner_id', user!.id)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', user?.id] })
      qc.invalidateQueries({ queryKey: ['transactions', user?.id] })
      qc.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
      qc.invalidateQueries({ queryKey: ['budgets', user?.id] })
    },
  })
}
