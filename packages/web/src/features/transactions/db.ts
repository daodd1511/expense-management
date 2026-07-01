import { z } from 'zod'
import type { Transaction } from '@/core/types'
import { apiJson } from '@/core/api'
import { transactionSchema } from '@wallet/shared'

const transactionsResponseSchema = z.object({
  data: z.array(transactionSchema),
})

const transactionResponseSchema = z.object({
  data: transactionSchema,
})

const deleteTransactionsResponseSchema = z.object({
  data: z.object({
    deletedIds: z.array(z.string()),
  }),
})

const okResponseSchema = z.object({
  ok: z.literal(true),
})

export async function fetchTransactions(_ownerId: string): Promise<Transaction[]> {
  const response = await apiJson('/transactions', transactionsResponseSchema)
  return response.data
}

export async function insertTransaction(transaction: Omit<Transaction, 'id'>, _ownerId: string): Promise<void> {
  await apiJson('/transactions', transactionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(transaction),
  })
}

export async function patchTransaction(
  id: string,
  patch: Partial<Transaction>,
  _ownerId: string,
): Promise<void> {
  await apiJson(`/transactions/${id}`, transactionResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteTransaction(id: string, _ownerId: string): Promise<void> {
  await apiJson(`/transactions/${id}`, okResponseSchema, {
    method: 'DELETE',
  })
}

export async function deleteTransactions(ids: string[], _ownerId: string): Promise<void> {
  await apiJson('/transactions', deleteTransactionsResponseSchema, {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  })
}
