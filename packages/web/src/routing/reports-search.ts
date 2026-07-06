import { z } from 'zod'
import { monthFilterSchema } from '@wallet/shared'

export const reportsSearchSchema = z.object({
  month: monthFilterSchema.optional(),
})

export type ReportsSearch = z.infer<typeof reportsSearchSchema>

export function validateReportsSearch(search: Record<string, unknown>): ReportsSearch {
  return reportsSearchSchema.parse(search)
}
