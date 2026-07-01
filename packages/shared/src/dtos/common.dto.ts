import { z } from 'zod'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const monthFilterSchema = z.string().regex(/^\d{4}-\d{2}$/)

export function atLeastOneKey<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
}
