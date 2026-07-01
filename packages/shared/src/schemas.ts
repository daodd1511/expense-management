import { z } from 'zod'
import type {
  AccountRow,
  BudgetRow,
  CategoryRow,
  SubscriptionRow,
  TransactionRow,
} from './types'

export const accountRowSchema: z.ZodType<AccountRow> = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  kind: z.enum(['cash', 'bank', 'card', 'ewallet']),
  opening_balance: z.number(),
  archived: z.boolean(),
  created_at: z.string(),
})

export const budgetRowSchema: z.ZodType<BudgetRow> = z.object({
  id: z.string(),
  owner_id: z.string(),
  category_id: z.string(),
  amount: z.number(),
  created_at: z.string(),
})

export const categoryRowSchema: z.ZodType<CategoryRow> = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  created_at: z.string(),
})

export const transactionRowSchema: z.ZodType<TransactionRow> = z.object({
  id: z.string(),
  owner_id: z.string(),
  type: z.enum(['expense', 'income', 'transfer']),
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

export const subscriptionRowSchema: z.ZodType<SubscriptionRow> = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(['expense', 'income']),
  category_id: z.string().nullable(),
  account_id: z.string(),
  cadence: z.enum(['monthly', 'yearly']),
  day_of_month: z.number(),
  month_of_year: z.number(),
  next_due_date: z.string(),
  note: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
})
