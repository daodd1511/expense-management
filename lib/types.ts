export type TxType = 'expense' | 'income' | 'transfer'

export type AccountKind = 'cash' | 'bank' | 'card' | 'ewallet'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  balance: number
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
}

export interface Budget {
  categoryId: string
  limit: number
}
