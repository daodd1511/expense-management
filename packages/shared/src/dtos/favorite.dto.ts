import { z } from 'zod'

export const favoriteRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  category_id: z.string(),
  created_at: z.string(),
})

export const favoriteCreateSchema = z.object({
  categoryId: z.string().min(1),
})

export type FavoriteRow = z.infer<typeof favoriteRowSchema>
export type FavoriteCreate = z.infer<typeof favoriteCreateSchema>
