import { z } from 'zod'
import { type TransactionCreate, type TransactionPatch } from '@wallet/shared'
import { ApiError } from '../../middleware/error'
import * as repository from './repository'
import { monthFilterSchema } from './schema'

function monthBounds(month: string) {
  const [year, value] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, value - 1, 1))
  const end = new Date(Date.UTC(year, value, 1))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export async function listTransactions(userId: string, month?: string) {
  if (month === undefined) {
    return repository.listTransactions({ userId })
  }

  const parsedMonth = monthFilterSchema.safeParse(month)
  if (!parsedMonth.success) {
    throw new ApiError(400, 'Invalid month query', z.flattenError(parsedMonth.error))
  }

  const { start, end } = monthBounds(parsedMonth.data)
  return repository.listTransactions({ userId, start, end })
}

export async function createTransaction(userId: string, transaction: TransactionCreate) {
  return repository.createTransaction(userId, transaction)
}

export async function updateTransaction(userId: string, id: string, patch: TransactionPatch) {
  const transaction = await repository.updateTransaction(userId, id, patch)
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found')
  }

  return transaction
}

export async function deleteTransactions(userId: string, ids: string[]) {
  return repository.deleteTransactions(userId, ids)
}

export async function deleteTransaction(userId: string, id: string) {
  const deleted = await repository.deleteTransaction(userId, id)
  if (!deleted) {
    throw new ApiError(404, 'Transaction not found')
  }
}
