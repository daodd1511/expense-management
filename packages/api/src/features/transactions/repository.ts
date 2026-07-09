import {
  accountRowSchema,
  fromTransaction,
  toTransaction,
  transactionPatchToRow,
  transactionRowSchema,
  type AccountRow,
  type Transaction,
  type TransactionCreate,
  type TransactionPatch,
  type TransactionRow,
} from '@wallet/shared'
import { getSupabase } from '../../config/supabase'
import { parseRows } from '../../lib/response'
import { ApiError } from '../../middleware/error'

function parseTransactionRow(data: unknown, message: string): Transaction {
  const result = transactionRowSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten())
  }

  return toTransaction(result.data)
}

function compareLedgerRows(a: TransactionRow, b: TransactionRow) {
  const dateComparison = a.tx_date.localeCompare(b.tx_date)
  if (dateComparison !== 0) return dateComparison

  const timeComparison = (a.tx_time ?? a.created_at.slice(11, 16)).localeCompare(b.tx_time ?? b.created_at.slice(11, 16))
  if (timeComparison !== 0) return timeComparison

  const createdAtComparison = a.created_at.localeCompare(b.created_at)
  if (createdAtComparison !== 0) return createdAtComparison

  return a.id.localeCompare(b.id)
}

export async function listAccountOpeningBalances(userId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('accounts').select('*').eq('owner_id', userId)

  if (error) {
    throw error
  }

  const accounts = parseRows(data, accountRowSchema, (row: AccountRow) => row)
  return Object.fromEntries(accounts.map((account) => [account.id, account.opening_balance]))
}

export async function listTransactionsForBalance(params: { userId: string; throughExclusive?: string }) {
  const supabase = getSupabase()
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', params.userId)
    .order('tx_date', { ascending: true })
    .order('tx_time', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (params.throughExclusive !== undefined) {
    query = query.lt('tx_date', params.throughExclusive)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return parseRows(data, transactionRowSchema, (row) => row)
    .sort(compareLedgerRows)
    .map(toTransaction)
}

export async function createTransaction(userId: string, transaction: TransactionCreate) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .insert(fromTransaction({ transaction, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return parseTransactionRow(data, 'Inserted transaction failed validation')
}

export async function updateTransaction(userId: string, id: string, patch: TransactionPatch) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .update(transactionPatchToRow(patch))
    .eq('id', id)
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return parseTransactionRow(data, 'Updated transaction failed validation')
}

export async function deleteTransactions(userId: string, ids: string[]) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids)
    .eq('owner_id', userId)
    .select('id')

  if (error) {
    throw error
  }

  return { deletedIds: (data ?? []).map((row) => row.id) }
}

export async function deleteTransaction(userId: string, id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}
