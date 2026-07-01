import { z } from 'zod'
import { txTypeSchema } from '../models'
import { atLeastOneKey, isoDateSchema } from './common.dto'

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
  date: isoDateSchema,
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
  date: isoDateSchema,
  receipt: z.string().trim().nullable(),
})

export const transactionBulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export type TransactionRow = z.infer<typeof transactionRowSchema>
export type TransactionCreate = z.infer<typeof transactionCreateSchema>
export type TransactionPatch = z.infer<typeof transactionPatchSchema>
export type TransactionBulkDelete = z.infer<typeof transactionBulkDeleteSchema>
