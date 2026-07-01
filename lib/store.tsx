
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  accounts as seedAccounts,
  budgets as seedBudgets,
  categories as seedCategories,
  subscriptions as seedSubscriptions,
  transactions as seedTransactions,
} from './data'
import type { Account, Budget, Category, Subscription, Transaction, TxType } from './types'

interface StoreValue {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
  subscriptions: Subscription[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, t: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  addAccount: (a: Omit<Account, 'id'>) => void
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id'>>) => void
  deleteAccount: (id: string) => void
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (id: string, c: Partial<Omit<Category, 'id'>>) => void
  getCategory: (id: string | null | undefined) => Category | undefined
  getAccount: (id: string | null | undefined) => Account | undefined
  addSubscription: (s: Omit<Subscription, 'id'>) => void
  updateSubscription: (id: string, patch: Partial<Omit<Subscription, 'id'>>) => void
  deleteSubscription: (id: string) => void
  logSubscription: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions)
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts)
  const [categories, setCategories] = useState<Category[]>(seedCategories)
  const [budgets] = useState<Budget[]>(seedBudgets)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions)

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [{ ...t, id: `tx-${Date.now()}` }, ...prev])
  }, [])

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    setAccounts((prev) => [...prev, { ...a, id: `acc-${Date.now()}` }])
  }, [])

  const updateAccount = useCallback((id: string, patch: Partial<Omit<Account, 'id'>>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    setCategories((prev) => [...prev, { ...c, id: `cat-${Date.now()}` }])
  }, [])

  const updateCategory = useCallback((id: string, patch: Partial<Omit<Category, 'id'>>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const addSubscription = useCallback((s: Omit<Subscription, 'id'>) => {
    setSubscriptions((prev) => [...prev, { ...s, id: `sub-${Date.now()}` }])
  }, [])

  const updateSubscription = useCallback((id: string, patch: Partial<Omit<Subscription, 'id'>>) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const deleteSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const logSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => {
      const s = prev.find((x) => x.id === id)
      if (!s) return prev
      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        type: s.type,
        amount: s.amount,
        categoryId: s.categoryId,
        accountId: s.accountId,
        merchant: s.name,
        note: s.note,
        date: new Date().toISOString().slice(0, 10),
        subscriptionId: s.id,
      }
      setTransactions((txs) => [tx, ...txs])
      return prev.map((x) => (x.id === id ? { ...x, nextDueDate: advanceNextDueDate(x) } : x))
    })
  }, [])

  const value = useMemo<StoreValue>(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const accMap = new Map(accounts.map((a) => [a.id, a]))
    return {
      transactions,
      accounts,
      categories,
      budgets,
      subscriptions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      getCategory: (id) => (id ? catMap.get(id) : undefined),
      getAccount: (id) => (id ? accMap.get(id) : undefined),
      addSubscription,
      updateSubscription,
      deleteSubscription,
      logSubscription,
    }
  }, [transactions, accounts, categories, budgets, subscriptions, addTransaction, updateTransaction, deleteTransaction, addAccount, updateAccount, deleteAccount, addCategory, updateCategory, addSubscription, updateSubscription, deleteSubscription, logSubscription])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// ---- Derived selectors (pure helpers) ----

function inCurrentMonth(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function monthSummary(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!inCurrentMonth(t.date)) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function expenseByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !inCurrentMonth(t.date) || !t.categoryId) continue
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
  }
  return map
}

export function spentForCategory(transactions: Transaction[], categoryId: string) {
  let total = 0
  for (const t of transactions) {
    if (t.type === 'expense' && t.categoryId === categoryId && inCurrentMonth(t.date)) {
      total += t.amount
    }
  }
  return total
}

function advanceNextDueDate(s: Subscription): string {
  const d = new Date(s.nextDueDate)
  if (s.cadence === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  } else {
    d.setFullYear(d.getFullYear() + 1)
  }
  return d.toISOString().slice(0, 10)
}

export type { Account, Budget, Category, Subscription, Transaction, TxType }
