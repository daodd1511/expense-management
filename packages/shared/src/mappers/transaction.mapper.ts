import type { Transaction } from '../models'
import type { TransactionPatch, TransactionRow } from '../dtos'

export function toTransaction(row: TransactionRow): Transaction {
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

export function fromTransaction(params: {
  transaction: Omit<Transaction, 'id'>
  ownerId: string
}) {
  const { transaction, ownerId } = params
  return {
    owner_id: ownerId,
    type: transaction.type,
    amount: transaction.amount,
    category_id: transaction.categoryId ?? null,
    account_id: transaction.accountId,
    to_account_id: transaction.toAccountId ?? null,
    merchant: transaction.merchant,
    note: transaction.note ?? null,
    tx_date: transaction.date,
    receipt_url: transaction.receipt ?? null,
    subscription_id: transaction.subscriptionId ?? null,
  }
}

export function transactionPatchToRow(patch: TransactionPatch) {
  return {
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
    ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
    ...(patch.accountId !== undefined && { account_id: patch.accountId }),
    ...(patch.toAccountId !== undefined && { to_account_id: patch.toAccountId }),
    ...(patch.merchant !== undefined && { merchant: patch.merchant }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.date !== undefined && { tx_date: patch.date }),
    ...(patch.receipt !== undefined && { receipt_url: patch.receipt }),
  }
}
