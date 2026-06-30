'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  accounts as seedAccounts,
  budgets as seedBudgets,
  categories as seedCategories,
  transactions as seedTransactions,
} from './data'
import type { Account, Budget, Category, Transaction, TxType } from './types'

interface StoreValue {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
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
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions)
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts)
  const [categories, setCategories] = useState<Category[]>(seedCategories)
  const [budgets] = useState<Budget[]>(seedBudgets)

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

  const value = useMemo<StoreValue>(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const accMap = new Map(accounts.map((a) => [a.id, a]))
    return {
      transactions,
      accounts,
      categories,
      budgets,
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
    }
  }, [transactions, accounts, categories, budgets, addTransaction, updateTransaction, deleteTransaction, addAccount, updateAccount, deleteAccount, addCategory, updateCategory])

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

export type { Account, Budget, Category, Transaction, TxType }
