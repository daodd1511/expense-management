import { Hono } from 'hono'
import {
  categoryCreateSchema,
  categoryPatchSchema,
  categoryPatchToRow,
  categoryRowSchema,
  fromCategory,
  toCategory,
} from '@wallet/shared'
import { supabase } from '../db/supabase'
import { jsonError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const categoriesRouter = new Hono<AuthEnv>()

categoriesRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .order('created_at', { ascending: true })

  if (error) {
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: parseRows(data, categoryRowSchema, toCategory) })
})

categoriesRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, categoryCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('categories')
    .insert(fromCategory(parsed.data, userId))
    .select('*')
    .single()

  if (error) {
    return jsonError(c, 500, error.message)
  }

  const category = categoryRowSchema.safeParse(data)
  if (!category.success) {
    return jsonError(c, 500, 'Inserted category failed validation', category.error.flatten())
  }

  return c.json({ data: toCategory(category.data) }, 201)
})

categoriesRouter.patch('/:id', async (c) => {
  const parsed = await parseJsonBody(c, categoryPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('categories')
    .update(categoryPatchToRow(parsed.data))
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Category not found')
  }

  const category = categoryRowSchema.safeParse(data)
  if (!category.success) {
    return jsonError(c, 500, 'Updated category failed validation', category.error.flatten())
  }

  return c.json({ data: toCategory(category.data) })
})

categoriesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const categoryId = c.req.param('id')

  const txUpdate = await supabase
    .from('transactions')
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (txUpdate.error) {
    return jsonError(c, 500, txUpdate.error.message)
  }

  const subUpdate = await supabase
    .from('subscriptions')
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (subUpdate.error) {
    return jsonError(c, 500, subUpdate.error.message)
  }

  const budgetDelete = await supabase
    .from('budgets')
    .delete()
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (budgetDelete.error) {
    return jsonError(c, 500, budgetDelete.error.message)
  }

  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Category not found')
  }

  return c.json({ ok: true })
})
