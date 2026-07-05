import { z } from 'zod'
import { monthFilterSchema } from './common.dto'

export const monthlyTotalSchema = z.object({
  month: monthFilterSchema,
  income: z.number(),
  expense: z.number(),
})

export const monthlyTotalsResponseSchema = z.object({
  data: z.array(monthlyTotalSchema),
})

export type MonthlyTotal = z.infer<typeof monthlyTotalSchema>
export type MonthlyTotalsResponse = z.infer<typeof monthlyTotalsResponseSchema>
