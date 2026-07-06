import type { TransactionBulkDelete, TransactionCreate, TransactionPatch } from '@wallet/shared'
import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import * as service from './service'

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error('Missing route param: id')
  }

  return id
}

export async function listTransactions(c: Context<AuthEnv>) {
  const data = await service.listTransactions(c.get('userId'), c.req.query('month'))
  return c.json({ data })
}

export async function createTransaction(userId: string, input: TransactionCreate) {
  return service.createTransaction(userId, input)
}

export async function updateTransaction(userId: string, id: string | undefined, input: TransactionPatch) {
  return service.updateTransaction(userId, requireId(id), input)
}

export async function deleteTransactions(userId: string, input: TransactionBulkDelete) {
  return service.deleteTransactions(userId, input.ids)
}

export async function deleteTransaction(c: Context<AuthEnv>) {
  await service.deleteTransaction(c.get('userId'), requireId(c.req.param('id')))
  return c.json({ ok: true })
}
