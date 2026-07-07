import { z } from 'zod'
import { txTypeSchema } from './common.model'

export const transactionSchema = z.object({
  id: z.string(),
  type: txTypeSchema,
  amount: z.number(),
  categoryId: z.string().nullable(),
  accountId: z.string(),
  toAccountId: z.string().nullable().optional(),
  merchant: z.string(),
  note: z.string().optional(),
  date: z.string(),
  time: z.string().optional(),
  receipt: z.string().nullable().optional(),
  subscriptionId: z.string().nullable().optional(),
})

export type Transaction = Readonly<z.infer<typeof transactionSchema>>
