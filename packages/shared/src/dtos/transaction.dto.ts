import { z } from 'zod'
import { txTypeSchema } from '../models'
import { atLeastOneKey, isoDateSchema, localTimeSchema } from './common.dto'

function todayIsoDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const transactionDateSchema = isoDateSchema.refine((value) => value <= todayIsoDate(), {
  message: 'Transaction date cannot be in the future',
})

export const transactionRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  type: txTypeSchema,
  amount: z.number(),
  category_id: z.string().nullable(),
  account_id: z.string(),
  to_account_id: z.string().nullable(),
  merchant: z.string(),
  note: z.string().nullable(),
  tx_date: z.string(),
  tx_time: z.string().nullable().optional(),
  receipt_url: z.string().nullable(),
  subscription_id: z.string().nullable(),
  created_at: z.string(),
})

export const transactionCreateSchema = z.object({
  type: txTypeSchema,
  amount: z.number(),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  toAccountId: z.string().min(1).nullable().optional(),
  merchant: z.string().trim().min(1),
  note: z.string().trim().optional(),
  date: transactionDateSchema,
  time: localTimeSchema.optional(),
  receipt: z.string().trim().nullable().optional(),
  subscriptionId: z.string().min(1).nullable().optional(),
})

export const transactionPatchSchema = atLeastOneKey({
  type: txTypeSchema,
  amount: z.number(),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  toAccountId: z.string().min(1).nullable(),
  merchant: z.string().trim().min(1),
  note: z.string().trim().nullable(),
  date: transactionDateSchema,
  time: localTimeSchema.nullable(),
  receipt: z.string().trim().nullable(),
})

export const transactionBulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export type TransactionRow = z.infer<typeof transactionRowSchema>
export type TransactionCreate = z.infer<typeof transactionCreateSchema>
export type TransactionPatch = z.infer<typeof transactionPatchSchema>
export type TransactionBulkDelete = z.infer<typeof transactionBulkDeleteSchema>
