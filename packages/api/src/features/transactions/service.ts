import { z } from 'zod'
import { computeRunningBalances, transactionSchema, type TransactionCreate, type TransactionPatch } from '@wallet/shared'
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
  let start: string | undefined
  let end: string | undefined

  if (month !== undefined) {
    const parsedMonth = monthFilterSchema.safeParse(month)
    if (!parsedMonth.success) {
      throw new ApiError(400, 'Invalid month query', z.flattenError(parsedMonth.error))
    }

    const bounds = monthBounds(parsedMonth.data)
    start = bounds.start
    end = bounds.end
  }

  const [openingBalances, ledgerTransactions] = await Promise.all([
    repository.listAccountOpeningBalances(userId),
    repository.listTransactionsForBalance({ userId, throughExclusive: end }),
  ])

  const transactionsWithBalances = computeRunningBalances(ledgerTransactions, openingBalances)
  const visibleTransactions =
    start === undefined || end === undefined
      ? transactionsWithBalances
      : transactionsWithBalances.filter((transaction) => transaction.date >= start && transaction.date < end)

  const response = z.array(transactionSchema).safeParse(visibleTransactions.toReversed())
  if (!response.success) {
    throw new ApiError(500, 'Transaction list failed validation', z.flattenError(response.error))
  }

  return response.data
}

export async function createTransaction(userId: string, transaction: TransactionCreate) {
  if (transaction.type === 'transfer' && (transaction.fee ?? 0) > 0) {
    return repository.createTransferWithFee(userId, transaction, transaction.fee!)
  }
  return repository.createTransaction(userId, transaction)
}

export async function updateTransaction(userId: string, id: string, patch: TransactionPatch) {
  const transaction = await repository.updateTransaction(userId, id, patch)
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found')
  }

  if (transaction.type !== 'transfer') return transaction

  const linkedFee = await repository.findLinkedTransferFee(userId, id)
  const fee = patch.fee
  if (fee === 0 && linkedFee) {
    await repository.deleteTransaction(userId, linkedFee.id)
  } else if (linkedFee) {
    await repository.updateTransaction(userId, linkedFee.id, {
      ...(fee !== undefined && { amount: fee }),
      accountId: transaction.accountId,
      date: transaction.date,
    })
  } else if (fee !== undefined && fee > 0) {
    const categoryId = await repository.findTransferFeeCategoryId()
    await repository.createLinkedTransferFee(userId, {
      type: 'expense', amount: fee, categoryId, accountId: transaction.accountId,
      toAccountId: null, merchant: 'Transfer Fee', date: transaction.date,
      time: transaction.time, receipt: null, subscriptionId: null, linkedTransferId: id,
    })
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
