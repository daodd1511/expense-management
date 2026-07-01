import { z } from 'zod'
import { supabase } from '@/core/supabase'
import type { Category } from '@/core/types'
import { secureParse } from '@/core/db/secure-parse'

// ---- DTO schema ----

const categoryRowSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  created_at: z.string(),
})

type CategoryRow = z.infer<typeof categoryRowSchema>

// ---- Mapper ----

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, isSystem: row.owner_id === null }
}

// ---- Repository ----

export async function fetchCategories(ownerId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`owner_id.eq.${ownerId},owner_id.is.null`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .map((row) => secureParse(categoryRowSchema, row))
    .filter((c): c is CategoryRow => c !== null)
    .map(toCategory)
}

export async function insertCategory(category: Pick<Category, 'name' | 'icon' | 'color'>, ownerId: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({
    owner_id: ownerId,
    name: category.name,
    icon: category.icon,
    color: category.color,
  })
  if (error) throw error
}

export async function patchCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', ownerId)
  if (error) throw error
}

export async function deleteCategory(id: string, ownerId: string): Promise<void> {
  await supabase.from('transactions').update({ category_id: null }).eq('category_id', id).eq('owner_id', ownerId)
  await supabase.from('subscriptions').update({ category_id: null }).eq('category_id', id).eq('owner_id', ownerId)
  await supabase.from('budgets').delete().eq('category_id', id).eq('owner_id', ownerId)
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) throw error
}
