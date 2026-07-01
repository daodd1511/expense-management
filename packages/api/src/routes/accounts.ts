import { Hono } from 'hono'
import {
  accountCreateSchema,
  accountPatchToRow,
  accountPatchSchema,
  accountRowSchema,
  fromAccount,
  toAccount,
} from '@wallet/shared'
import { supabase } from '../db/supabase'
import { jsonError, parseJsonBody, parseRows } from '../lib/http'
import type { AuthEnv } from '../middleware/auth'

export const accountsRouter = new Hono<AuthEnv>()

accountsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: true })

  if (error) {
    return jsonError(c, 500, error.message)
  }

  return c.json({ data: parseRows(data, accountRowSchema, toAccount) })
})

accountsRouter.post('/', async (c) => {
  const parsed = await parseJsonBody(c, accountCreateSchema)
  if (!parsed.success) return parsed.response

  const userId = c.get('userId')
  const { data, error } = await supabase
    .from('accounts')
    .insert(fromAccount(parsed.data, userId))
    .select('*')
    .single()

  if (error) {
    return jsonError(c, 500, error.message)
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
  const { data, error } = await supabase
    .from('accounts')
    .update(accountPatchToRow(parsed.data))
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
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
  const { data, error } = await supabase
    .from('accounts')
    .update({ archived: true })
    .eq('id', c.req.param('id'))
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return jsonError(c, 500, error.message)
  }
  if (!data) {
    return jsonError(c, 404, 'Account not found')
  }

  return c.json({ ok: true })
})
