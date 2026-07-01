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
  color: string // chart token: chart-1..5 or income/expense
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
  date: string // ISO
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
  dayOfMonth: number   // 1–28 (clamped to avoid Feb edge cases)
  monthOfYear: number  // 1–12, only used when cadence = 'yearly'
  nextDueDate: string  // ISO date string
  note?: string
  active: boolean
}

export interface Budget {
  categoryId: string
  limit: number
}
