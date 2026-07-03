import { Hono } from 'hono'
import {
  categoryCreateSchema,
  categoryPatchSchema,
  categoryPatchToRow,
  categoryRowSchema,
  fromCategory,
  toCategory,
} from '@wallet/shared'
import { getSupabase } from '../db/supabase'
import { jsonError, mapDbError, parseJsonBody, parseRawJsonBody, parseRows, type DbError } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

/** Minimal shape needed to validate a parent_id target without a full row fetch. */
type ParentCandidate = { id: string; type: string; parent_id: string | null; owner_id: string | null }

type ParentCandidateResult =
  | { error: DbError }
  | { notFound: true }
  | { candidate: ParentCandidate }

async function loadParentCandidate(
  supabase: ReturnType<typeof getSupabase>,
  parentId: string,
  userId: string,
): Promise<ParentCandidateResult> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, type, parent_id, owner_id')
    .eq('id', parentId)
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .maybeSingle()

  if (error) return { error }
  if (!data) return { notFound: true }
  return { candidate: data as ParentCandidate }
}

export const categoriesRouter = new Hono<AuthEnv>()

categoriesRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .order('created_at', { ascending: true })

  if (error) {
    return mapDbError(c, error)
  }

  return c.json({ data: parseRows(data, categoryRowSchema, toCategory) })
})

categoriesRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, categoryCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()

  if (parsed.data.parentId) {
    const result = await loadParentCandidate(supabase, parsed.data.parentId, userId)
    if ('error' in result) return mapDbError(c, result.error)
    if ('notFound' in result) return jsonError(c, 400, 'parentId does not exist')
    if (result.candidate.parent_id !== null) {
      return jsonError(c, 400, 'parentId target is itself a child; nesting is capped at 2 levels')
    }
    if (result.candidate.type !== parsed.data.type) {
      return jsonError(c, 400, 'type must match parentId category type')
    }
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(fromCategory({ category: parsed.data, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    return mapDbError(c, error)
  }

  const category = categoryRowSchema.safeParse(data)
  if (!category.success) {
    return jsonError(c, 500, 'Inserted category failed validation', category.error.flatten())
  }

  return c.json({ data: toCategory(category.data) }, 201)
})

categoriesRouter.patch('/:id', async (c) => {
  const raw = await parseRawJsonBody(c)
  if (!raw.success) return raw.response

  if (typeof raw.data === 'object' && raw.data !== null && 'type' in raw.data) {
    return jsonError(c, 400, 'type is immutable and cannot be patched')
  }

  const parsed = categoryPatchSchema.safeParse(raw.data)
  if (!parsed.success) {
    return jsonError(c, 400, 'Invalid request body', parsed.error.flatten())
  }

  const userId = c.get('userId')
  const categoryId = c.req.param('id')
  const supabase = getSupabase()

  const existingResult = await supabase
    .from('categories')
    .select('id, type, parent_id, owner_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (existingResult.error) {
    return mapDbError(c, existingResult.error)
  }
  if (!existingResult.data) {
    return jsonError(c, 404, 'Category not found')
  }
  const existing = existingResult.data as ParentCandidate

  if (existing.owner_id === null) {
    return jsonError(c, 403, 'System categories cannot be edited')
  }
  if (existing.owner_id !== userId) {
    return jsonError(c, 404, 'Category not found')
  }

  if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
    const parentResult = await loadParentCandidate(supabase, parsed.data.parentId, userId)
    if ('error' in parentResult) return mapDbError(c, parentResult.error)
    if ('notFound' in parentResult) return jsonError(c, 400, 'parentId does not exist')
    if (parentResult.candidate.parent_id !== null) {
      return jsonError(c, 400, 'parentId target is itself a child; nesting is capped at 2 levels')
    }
    if (parentResult.candidate.type !== existing.type) {
      return jsonError(c, 400, 'parentId target type does not match category type')
    }

    const childCount = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoryId)
    if (childCount.error) return mapDbError(c, childCount.error)
    if ((childCount.count ?? 0) > 0) {
      return jsonError(c, 400, 'category has children and cannot be re-parented')
    }

    // Budgets are leaf-or-parent-direct only within a branch — re-parenting a
    // budgeted leaf under a budgeted parent would silently create both at once.
    const budgetConflict = await supabase
      .from('budgets')
      .select('category_id')
      .in('category_id', [categoryId, parsed.data.parentId])
      .eq('owner_id', userId)
    if (budgetConflict.error) return mapDbError(c, budgetConflict.error)
    const budgetedIds = new Set((budgetConflict.data ?? []).map((b) => b.category_id))
    if (budgetedIds.has(categoryId) && budgetedIds.has(parsed.data.parentId)) {
      return jsonError(c, 400, 'both category and parentId already have budgets; remove one first')
    }
  }

  const { data, error } = await supabase
    .from('categories')
    .update(categoryPatchToRow(parsed.data))
    .eq('id', categoryId)
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
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
  const supabase = getSupabase()

  const existingResult = await supabase
    .from('categories')
    .select('id, owner_id')
    .eq('id', categoryId)
    .maybeSingle()
  if (existingResult.error) {
    return mapDbError(c, existingResult.error)
  }
  if (!existingResult.data) {
    return jsonError(c, 404, 'Category not found')
  }
  if (existingResult.data.owner_id === null) {
    return jsonError(c, 403, 'System categories cannot be deleted')
  }
  if (existingResult.data.owner_id !== userId) {
    return jsonError(c, 404, 'Category not found')
  }

  const childCount = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', categoryId)
  if (childCount.error) {
    return mapDbError(c, childCount.error)
  }
  if ((childCount.count ?? 0) > 0) {
    return jsonError(c, 409, 'Category has children; delete or reassign them first')
  }

  const txUpdate = await supabase
    .from('transactions')
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (txUpdate.error) {
    return mapDbError(c, txUpdate.error)
  }

  const subUpdate = await supabase
    .from('subscriptions')
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (subUpdate.error) {
    return mapDbError(c, subUpdate.error)
  }

  const budgetDelete = await supabase
    .from('budgets')
    .delete()
    .eq('category_id', categoryId)
    .eq('owner_id', userId)
  if (budgetDelete.error) {
    return mapDbError(c, budgetDelete.error)
  }

  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Category not found')
  }

  return c.json({ ok: true })
})
