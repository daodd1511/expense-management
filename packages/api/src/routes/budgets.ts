import { Hono } from 'hono'
import {
  budgetCreateSchema,
  budgetPatchSchema,
  budgetRowSchema,
  fromBudget,
  toBudget,
} from '@wallet/shared'
import { supabase } from '../db/supabase'
import { jsonError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const budgetsRouter = new Hono<AuthEnv>()

budgetsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: parseRows(data, budgetRowSchema, toBudget) })
})

budgetsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, budgetCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('budgets')
    .insert(fromBudget(parsed.data, userId))
    .select('*')
    .single()

  if (error) {
    return jsonError(c, 500, error.message)
  }

  const budget = budgetRowSchema.safeParse(data)
  if (!budget.success) {
    return jsonError(c, 500, 'Inserted budget failed validation', budget.error.flatten())
  }

  return c.json({ data: toBudget(budget.data) }, 201)
})

budgetsRouter.patch('/:categoryId', async (c) => {
  const parsed = await parseJsonBody(c, budgetPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('budgets')
    .update({ amount: parsed.data.limit })
    .eq('category_id', c.req.param('categoryId'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Budget not found')
  }

  const budget = budgetRowSchema.safeParse(data)
  if (!budget.success) {
    return jsonError(c, 500, 'Updated budget failed validation', budget.error.flatten())
  }

  return c.json({ data: toBudget(budget.data) })
})

budgetsRouter.delete('/:categoryId', async (c) => {
  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('category_id', c.req.param('categoryId'))
    .eq('owner_id', userId)
    .select('id')

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data || data.length === 0) {
    return jsonError(c, 404, 'Budget not found')
  }

  return c.json({ ok: true })
})
