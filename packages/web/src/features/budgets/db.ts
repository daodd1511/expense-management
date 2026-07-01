import { supabase } from '@/core/supabase'
import type { Budget } from '@/core/types'
import { budgetRowSchema, secureParse, type BudgetRow } from '@wallet/shared'

// ---- Mapper ----

function toBudget(row: BudgetRow): Budget {
  return { categoryId: row.category_id, limit: row.amount }
}

// ---- Repository ----

export async function fetchBudgets(ownerId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .map((row) => secureParse(budgetRowSchema, row))
    .filter((b): b is BudgetRow => b !== null)
    .map(toBudget)
}

export async function insertBudget(budget: Budget, ownerId: string): Promise<void> {
  const { error } = await supabase.from('budgets').insert({
    owner_id: ownerId,
    category_id: budget.categoryId,
    amount: budget.limit,
  })
  if (error) throw error
}

export async function updateBudget(categoryId: string, limit: number, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .update({ amount: limit })
    .eq('category_id', categoryId)
    .eq('owner_id', ownerId)
  if (error) throw error
}

export async function deleteBudget(categoryId: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('category_id', categoryId)
    .eq('owner_id', ownerId)
  if (error) throw error
}
