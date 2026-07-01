import { z } from 'zod'

const txTypeSchema = z.enum(['expense', 'income', 'transfer'])
const accountKindSchema = z.enum(['cash', 'bank', 'card', 'ewallet'])
const subscriptionCadenceSchema = z.enum(['monthly', 'yearly'])

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function atLeastOneKey<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
}

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1),
  kind: accountKindSchema,
  openingBalance: z.number(),
})

export const accountPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  kind: accountKindSchema,
  openingBalance: z.number(),
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

export const budgetCreateSchema = z.object({
  categoryId: z.string().min(1),
  limit: z.number(),
})

export const budgetPatchSchema = z.object({
  limit: z.number(),
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

export const subscriptionCreateSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number(),
  type: z.enum(['expense', 'income']),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  cadence: subscriptionCadenceSchema,
  dayOfMonth: z.number().int().min(1).max(31),
  monthOfYear: z.number().int().min(1).max(12),
  nextDueDate: isoDateSchema,
  note: z.string().trim().optional(),
  active: z.boolean(),
})

export const subscriptionPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  amount: z.number(),
  type: z.enum(['expense', 'income']),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  cadence: subscriptionCadenceSchema,
  dayOfMonth: z.number().int().min(1).max(31),
  monthOfYear: z.number().int().min(1).max(12),
  nextDueDate: isoDateSchema,
  note: z.string().trim().nullable(),
  active: z.boolean(),
})

export const monthFilterSchema = z.string().regex(/^\d{4}-\d{2}$/)

export type AccountCreate = z.infer<typeof accountCreateSchema>
export type AccountPatch = z.infer<typeof accountPatchSchema>
export type CategoryCreate = z.infer<typeof categoryCreateSchema>
export type CategoryPatch = z.infer<typeof categoryPatchSchema>
export type BudgetCreate = z.infer<typeof budgetCreateSchema>
export type BudgetPatch = z.infer<typeof budgetPatchSchema>
export type TransactionCreate = z.infer<typeof transactionCreateSchema>
export type TransactionPatch = z.infer<typeof transactionPatchSchema>
export type TransactionBulkDelete = z.infer<typeof transactionBulkDeleteSchema>
export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>
export type SubscriptionPatch = z.infer<typeof subscriptionPatchSchema>
