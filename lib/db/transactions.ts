import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/lib/types'
import { secureParse } from './secure-parse'

// ---- DTO schema ----

const transactionRowSchema = z.object({
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

type TransactionRow = z.infer<typeof transactionRowSchema>

// ---- Mapper ----

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    merchant: row.merchant,
    note: row.note ?? undefined,
    date: row.tx_date,
    receipt: row.receipt_url ?? undefined,
    subscriptionId: row.subscription_id,
  }
}

function fromTransaction(t: Omit<Transaction, 'id'>, ownerId: string) {
  return {
    owner_id: ownerId,
    type: t.type,
    amount: t.amount,
    category_id: t.categoryId ?? null,
    account_id: t.accountId,
    to_account_id: t.toAccountId ?? null,
    merchant: t.merchant,
    note: t.note ?? null,
    tx_date: t.date,
    receipt_url: t.receipt ?? null,
    subscription_id: t.subscriptionId ?? null,
  }
}

// ---- Repository ----

export async function fetchTransactions(ownerId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('tx_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? [])
    .map((row) => secureParse(transactionRowSchema, row))
    .filter((t): t is TransactionRow => t !== null)
    .map(toTransaction)
}

export async function insertTransaction(transaction: Omit<Transaction, 'id'>, ownerId: string): Promise<void> {
  const { error } = await supabase.from('transactions').insert(fromTransaction(transaction, ownerId))
  if (error) throw error
}

export async function patchTransaction(
  id: string,
  patch: Partial<Transaction>,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({
      ...(patch.type !== undefined && { type: patch.type }),
      ...(patch.amount !== undefined && { amount: patch.amount }),
      ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
      ...(patch.accountId !== undefined && { account_id: patch.accountId }),
      ...(patch.toAccountId !== undefined && { to_account_id: patch.toAccountId }),
      ...(patch.merchant !== undefined && { merchant: patch.merchant }),
      ...(patch.note !== undefined && { note: patch.note }),
      ...(patch.date !== undefined && { tx_date: patch.date }),
      ...(patch.receipt !== undefined && { receipt_url: patch.receipt }),
    })
    .eq('id', id)
    .eq('owner_id', ownerId)
  if (error) throw error
}

export async function deleteTransaction(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) throw error
}

export async function deleteTransactions(ids: string[], ownerId: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().in('id', ids).eq('owner_id', ownerId)
  if (error) throw error
}
