import { Hono } from 'hono'
import {
  fromTransaction,
  monthFilterSchema,
  toTransaction,
  transactionBulkDeleteSchema,
  transactionCreateSchema,
  transactionPatchSchema,
  transactionPatchToRow,
  transactionRowSchema,
} from '@wallet/shared'
import { supabase } from '../db/supabase'
import { jsonError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

function monthBounds(month: string) {
  const [year, value] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, value - 1, 1))
  const end = new Date(Date.UTC(year, value, 1))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export const transactionsRouter = new Hono<AuthEnv>()

transactionsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const month = c.req.query('month')

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('owner_id', userId)
    .order('tx_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (month !== undefined) {
    const parsedMonth = monthFilterSchema.safeParse(month)
    if (!parsedMonth.success) {
      return jsonError(c, 400, 'Invalid month query', parsedMonth.error.flatten())
    }
    const { start, end } = monthBounds(parsedMonth.data)
    query = query.gte('tx_date', start).lt('tx_date', end)
  }

  const { data, error } = await query
  if (error) {
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: parseRows(data, transactionRowSchema, toTransaction) })
})

transactionsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, transactionCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('transactions')
    .insert(fromTransaction(parsed.data, userId))
    .select('*')
    .single()

  if (error) {
    return jsonError(c, 500, error.message)
  }

  const transaction = transactionRowSchema.safeParse(data)
  if (!transaction.success) {
    return jsonError(c, 500, 'Inserted transaction failed validation', transaction.error.flatten())
  }

  return c.json({ data: toTransaction(transaction.data) }, 201)
})

transactionsRouter.patch('/:id', async (c) => {
  const parsed = await parseJsonBody(c, transactionPatchSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('transactions')
    .update(transactionPatchToRow(parsed.data))
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Transaction not found')
  }

  const transaction = transactionRowSchema.safeParse(data)
  if (!transaction.success) {
    return jsonError(c, 500, 'Updated transaction failed validation', transaction.error.flatten())
  }

  return c.json({ data: toTransaction(transaction.data) })
})

transactionsRouter.delete('/', async (c) => {
  const parsed = await parseJsonBody(c, transactionBulkDeleteSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .in('id', parsed.data.ids)
    .eq('owner_id', userId)
    .select('id')

  if (error) {
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: { deletedIds: (data ?? []).map((row) => row.id) } })
})

transactionsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Transaction not found')
  }

  return c.json({ ok: true })
})
