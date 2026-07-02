import { z } from 'zod'
import { categoryTypeSchema } from '../models/category.model'
import { atLeastOneKey } from './common.dto'

export const categoryRowSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  created_at: z.string(),
  type: categoryTypeSchema,
  parent_id: z.string().nullable(),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  color: z.string().trim().min(1),
  type: categoryTypeSchema,
  parentId: z.string().nullable().optional(),
})

export const categoryPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  color: z.string().trim().min(1),
  parentId: z.string().nullable(),
})

export type CategoryRow = z.infer<typeof categoryRowSchema>
export type CategoryCreate = z.infer<typeof categoryCreateSchema>
export type CategoryPatch = z.infer<typeof categoryPatchSchema>
