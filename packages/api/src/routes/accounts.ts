import { Hono } from 'hono'
import {
  computeBalance,
  accountCreateSchema,
  accountPatchToRow,
  accountPatchSchema,
  accountRowSchema,
  transactionRowSchema,
  fromAccount,
  toAccount,
  toTransaction,
} from '@wallet/shared'
import { getSupabase } from '../db/supabase'
import { jsonError, mapDbError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const accountsRouter = new Hono<AuthEnv>()

accountsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: true })

  if (error) {
    return mapDbError(c, error)
  }

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', userId)

  if (transactionError) {
    return mapDbError(c, transactionError)
  }

  const transactions = parseRows(transactionData, transactionRowSchema, toTransaction)
  const accounts = parseRows(data, accountRowSchema, toAccount).map((account) => ({
    ...account,
    balance: computeBalance(account.id, transactions, account.openingBalance),
  }))

  return c.json({ data: accounts })
})

accountsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, accountCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .insert(fromAccount({ account: parsed.data, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    return mapDbError(c, error)
  }

  const account = accountRowSchema.safeParse(data)
  if (!account.success) {
    return jsonError(c, 500, 'Inserted account failed validation', account.error.flatten())
  }

  return c.json({ data: toAccount(account.data) }, 201)
})

accountsRouter.patch('/:id', async (c) => {
  const parsed = await parseJsonBody(c, accountPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .update(accountPatchToRow(parsed.data))
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Account not found')
  }

  const account = accountRowSchema.safeParse(data)
  if (!account.success) {
    return jsonError(c, 500, 'Updated account failed validation', account.error.flatten())
  }

  return c.json({ data: toAccount(account.data) })
})

accountsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .update({ archived: true })
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return mapDbError(c, error)
  }
  if (!data) {
    return jsonError(c, 404, 'Account not found')
  }

  return c.json({ ok: true })
})
