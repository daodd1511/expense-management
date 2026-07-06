import { Hono } from 'hono'
import {
  favoriteCreateSchema,
  favoriteRowSchema,
  fromFavorite,
  toFavorite,
} from '@wallet/shared'
import { getSupabase } from '../config/supabase'
import { jsonError, mapDbError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const favoritesRouter = new Hono<AuthEnv>()

favoritesRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('category_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return mapDbError(c, error)
  }

  return c.json({ data: parseRows(data, favoriteRowSchema, toFavorite) })
})

favoritesRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, favoriteCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()

  const existing = await supabase
    .from('category_favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', parsed.data.categoryId)
    .maybeSingle()
  if (existing.error) {
    return mapDbError(c, existing.error)
  }
  if (existing.data) {
    const favorite = favoriteRowSchema.safeParse(existing.data)
    if (!favorite.success) {
      return jsonError(c, 500, 'Existing favorite failed validation', favorite.error.flatten())
    }
    return c.json({ data: toFavorite(favorite.data) })
  }

  const { data, error } = await supabase
    .from('category_favorites')
    .insert(fromFavorite({ categoryId: parsed.data.categoryId, userId }))
    .select('*')
    .single()

  if (error) {
    return mapDbError(c, error)
  }

  const favorite = favoriteRowSchema.safeParse(data)
  if (!favorite.success) {
    return jsonError(c, 500, 'Inserted favorite failed validation', favorite.error.flatten())
  }

  return c.json({ data: toFavorite(favorite.data) }, 201)
})

favoritesRouter.delete('/:categoryId', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('category_favorites')
    .delete()
    .eq('category_id', c.req.param('categoryId'))
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Favorite not found')
  }

  return c.json({ ok: true })
})
