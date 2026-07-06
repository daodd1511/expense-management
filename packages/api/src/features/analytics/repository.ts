import {
  accountRowSchema,
  toAccount,
  toTransaction,
  transactionRowSchema,
  type Account,
  type Transaction,
} from '@wallet/shared'
import { getSupabase } from '../../config/supabase'
import { parseRows } from '../../lib/response'

export async function listActiveAccounts(userId: string): Promise<Account[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('accounts').select('*').eq('owner_id', userId).eq('archived', false)

  if (error) {
    throw error
  }

  return parseRows(data, accountRowSchema, toAccount)
}

export async function listTransactions(userId: string): Promise<Transaction[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('transactions').select('*').eq('owner_id', userId)

  if (error) {
    throw error
  }

  return parseRows(data, transactionRowSchema, toTransaction)
}
