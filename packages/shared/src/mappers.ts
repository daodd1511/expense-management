import type {
  Account,
  AccountRow,
  Budget,
  BudgetRow,
  Category,
  CategoryRow,
  Subscription,
  SubscriptionRow,
  Transaction,
  TransactionRow,
} from './types'

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalance: row.opening_balance,
  }
}

export function fromAccount(account: Omit<Account, 'id'>, ownerId: string) {
  return {
    owner_id: ownerId,
    name: account.name,
    kind: account.kind,
    opening_balance: account.openingBalance,
  }
}

export function accountPatchToRow(patch: Partial<Omit<Account, 'id'>>) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.kind !== undefined && { kind: patch.kind }),
    ...(patch.openingBalance !== undefined && { opening_balance: patch.openingBalance }),
  }
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isSystem: row.owner_id === null,
  }
}

export function fromCategory(category: Pick<Category, 'name' | 'icon' | 'color'>, ownerId: string) {
  return {
    owner_id: ownerId,
    name: category.name,
    icon: category.icon,
    color: category.color,
  }
}

export function categoryPatchToRow(patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.icon !== undefined && { icon: patch.icon }),
    ...(patch.color !== undefined && { color: patch.color }),
  }
}

export function toBudget(row: BudgetRow): Budget {
  return { categoryId: row.category_id, limit: row.amount }
}

export function fromBudget(budget: Budget, ownerId: string) {
  return {
    owner_id: ownerId,
    category_id: budget.categoryId,
    amount: budget.limit,
  }
}

export function budgetPatchToRow(limit: number) {
  return { amount: limit }
}

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

export function fromTransaction(transaction: Omit<Transaction, 'id'>, ownerId: string) {
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

export function transactionPatchToRow(patch: {
  type?: Transaction['type']
  amount?: number
  categoryId?: string | null
  accountId?: string
  toAccountId?: string | null
  merchant?: string
  note?: string | null
  date?: string
  receipt?: string | null
}) {
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

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    accountId: row.account_id,
    cadence: row.cadence,
    dayOfMonth: row.day_of_month,
    monthOfYear: row.month_of_year,
    nextDueDate: row.next_due_date,
    note: row.note ?? undefined,
    active: row.active,
  }
}

export function fromSubscription(subscription: Omit<Subscription, 'id'>, ownerId: string) {
  return {
    owner_id: ownerId,
    name: subscription.name,
    amount: subscription.amount,
    type: subscription.type,
    category_id: subscription.categoryId ?? null,
    account_id: subscription.accountId,
    cadence: subscription.cadence,
    day_of_month: subscription.dayOfMonth,
    month_of_year: subscription.monthOfYear,
    next_due_date: subscription.nextDueDate,
    note: subscription.note ?? null,
    active: subscription.active,
  }
}

export function subscriptionPatchToRow(patch: {
  name?: string
  amount?: number
  type?: Subscription['type']
  categoryId?: string | null
  accountId?: string
  cadence?: Subscription['cadence']
  dayOfMonth?: number
  monthOfYear?: number
  nextDueDate?: string
  note?: string | null
  active?: boolean
}) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
    ...(patch.accountId !== undefined && { account_id: patch.accountId }),
    ...(patch.cadence !== undefined && { cadence: patch.cadence }),
    ...(patch.dayOfMonth !== undefined && { day_of_month: patch.dayOfMonth }),
    ...(patch.monthOfYear !== undefined && { month_of_year: patch.monthOfYear }),
    ...(patch.nextDueDate !== undefined && { next_due_date: patch.nextDueDate }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.active !== undefined && { active: patch.active }),
  }
}

export function advanceNextDueDate(subscription: Subscription): string {
  const nextDate = new Date(subscription.nextDueDate)
  if (subscription.cadence === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1)
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1)
  }
  return nextDate.toISOString().slice(0, 10)
}
