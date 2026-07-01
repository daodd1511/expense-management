import { z } from 'zod'
import { atLeastOneKey } from './common.dto'

export const categoryRowSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  created_at: z.string(),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  color: z.string().trim().min(1),
})

export const categoryPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  color: z.string().trim().min(1),
})

export type CategoryRow = z.infer<typeof categoryRowSchema>
export type CategoryCreate = z.infer<typeof categoryCreateSchema>
export type CategoryPatch = z.infer<typeof categoryPatchSchema>
