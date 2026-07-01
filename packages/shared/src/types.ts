export type TxType = 'expense' | 'income' | 'transfer'

export type Lang = 'vi' | 'en'

export type AccountKind = 'cash' | 'bank' | 'card' | 'ewallet'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  openingBalance: number
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  isSystem: boolean
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  categoryId: string | null
  accountId: string
  toAccountId?: string | null
  merchant: string
  note?: string
  date: string
  receipt?: string | null
  subscriptionId?: string | null
}

export type SubscriptionCadence = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  name: string
  amount: number
  type: 'expense' | 'income'
  categoryId: string | null
  accountId: string
  cadence: SubscriptionCadence
  dayOfMonth: number
  monthOfYear: number
  nextDueDate: string
  note?: string
  active: boolean
}

export interface Budget {
  categoryId: string
  limit: number
}

export interface AccountRow {
  id: string
  owner_id: string
  name: string
  kind: AccountKind
  opening_balance: number
  archived: boolean
  created_at: string
}

export interface BudgetRow {
  id: string
  owner_id: string
  category_id: string
  amount: number
  created_at: string
}

export interface CategoryRow {
  id: string
  owner_id: string | null
  name: string
  icon: string
  color: string
  created_at: string
}

export interface TransactionRow {
  id: string
  owner_id: string
  type: TxType
  amount: number
  category_id: string | null
  account_id: string
  to_account_id: string | null
  merchant: string
  note: string | null
  tx_date: string
  receipt_url: string | null
  subscription_id: string | null
  created_at: string
}

export interface SubscriptionRow {
  id: string
  owner_id: string
  name: string
  amount: number
  type: 'expense' | 'income'
  category_id: string | null
  account_id: string
  cadence: SubscriptionCadence
  day_of_month: number
  month_of_year: number
  next_due_date: string
  note: string | null
  active: boolean
  created_at: string
}
