import { z } from 'zod'
import { apiJson } from '@/core/api'
import { favoriteSchema } from '@wallet/shared'

const favoritesResponseSchema = z.object({
  data: z.array(favoriteSchema),
})

const favoriteResponseSchema = z.object({
  data: favoriteSchema,
})

const okResponseSchema = z.object({
  ok: z.literal(true),
})

export async function fetchFavorites(): Promise<string[]> {
  const response = await apiJson('/favorites', favoritesResponseSchema)
  return response.data.map((favorite) => favorite.categoryId)
}

export async function addFavoriteCategory(categoryId: string): Promise<void> {
  await apiJson('/favorites', favoriteResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ categoryId }),
  })
}

export async function removeFavoriteCategory(categoryId: string): Promise<void> {
  await apiJson(`/favorites/${categoryId}`, okResponseSchema, {
    method: 'DELETE',
  })
}
