import { createContext, useCallback, useContext, useMemo } from 'react'
import {
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useUpdateAccount,
} from './queries/accounts'
import {
  useAddCategory,
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from './queries/categories'
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from './queries/transactions'
import {
  useAddBudget,
  useBudgets,
  useDeleteBudget,
  useUpdateBudget,
} from './queries/budgets'
import {
  useAddSubscription,
  useDeleteSubscription,
  useLogSubscription,
  useSubscriptions,
  useUpdateSubscription,
} from './queries/subscriptions'
import type { Account, Budget, Category, Subscription, Transaction, TxType } from './types'

export interface StoreValue {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
  subscriptions: Subscription[]
  loading: boolean
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  deleteTransactions: (ids: string[]) => void
  addAccount: (a: Omit<Account, 'id'>) => void
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id'>>) => void
  deleteAccount: (id: string) => void
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void
  deleteCategory: (id: string) => void
  getCategory: (id: string | null | undefined) => Category | undefined
  getAccount: (id: string | null | undefined) => Account | undefined
  addBudget: (b: Budget) => void
  updateBudget: (categoryId: string, limit: number) => void
  deleteBudget: (categoryId: string) => void
  addSubscription: (s: Omit<Subscription, 'id'>) => void
  updateSubscription: (id: string, patch: Partial<Omit<Subscription, 'id'>>) => void
  deleteSubscription: (id: string) => void
  logSubscription: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const txQuery = useTransactions()
  const accQuery = useAccounts()
  const catQuery = useCategories()
  const budgetQuery = useBudgets()
  const subQuery = useSubscriptions()

  const addTx = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  // bulk delete handled inline via individual deleteTx or a dedicated hook if needed
  const addAcc = useAddAccount()
  const updateAcc = useUpdateAccount()
  const deleteAcc = useDeleteAccount()
  const addCat = useAddCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()
  const addBud = useAddBudget()
  const updateBud = useUpdateBudget()
  const deleteBud = useDeleteBudget()
  const addSub = useAddSubscription()
  const updateSub = useUpdateSubscription()
  const deleteSub = useDeleteSubscription()
  const logSub = useLogSubscription()

  const transactions = txQuery.data ?? []
  const accounts = accQuery.data ?? []
  const categories = catQuery.data ?? []
  const budgets = budgetQuery.data ?? []
  const subscriptions = subQuery.data ?? []

  const loading =
    txQuery.isLoading ||
    accQuery.isLoading ||
    catQuery.isLoading ||
    budgetQuery.isLoading ||
    subQuery.isLoading

  const addTransaction = useCallback(
    (t: Omit<Transaction, 'id'>) => addTx.mutate(t),
    [addTx],
  )
  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => updateTx.mutate({ id, patch }),
    [updateTx],
  )
  const deleteTransaction = useCallback(
    (id: string) => deleteTx.mutate(id),
    [deleteTx],
  )
  const deleteTransactions = useCallback(
    (ids: string[]) => ids.forEach((id) => deleteTx.mutate(id)),
    [deleteTx],
  )

  const addAccount = useCallback(
    (a: Omit<Account, 'id'>) => addAcc.mutate(a),
    [addAcc],
  )
  const updateAccount = useCallback(
    (id: string, patch: Partial<Omit<Account, 'id'>>) => updateAcc.mutate({ id, patch }),
    [updateAcc],
  )
  const deleteAccount = useCallback(
    (id: string) => deleteAcc.mutate(id),
    [deleteAcc],
  )

  const addCategory = useCallback(
    (c: Omit<Category, 'id'>) => addCat.mutate(c),
    [addCat],
  )
  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<Category, 'id'>>) => updateCat.mutate({ id, patch }),
    [updateCat],
  )
  const deleteCategory = useCallback(
    (id: string) => deleteCat.mutate(id),
    [deleteCat],
  )

  const addBudget = useCallback(
    (b: Budget) => addBud.mutate(b),
    [addBud],
  )
  const updateBudget = useCallback(
    (categoryId: string, limit: number) => updateBud.mutate({ categoryId, limit }),
    [updateBud],
  )
  const deleteBudget = useCallback(
    (categoryId: string) => deleteBud.mutate(categoryId),
    [deleteBud],
  )

  const addSubscription = useCallback(
    (s: Omit<Subscription, 'id'>) => addSub.mutate(s),
    [addSub],
  )
  const updateSubscription = useCallback(
    (id: string, patch: Partial<Omit<Subscription, 'id'>>) => updateSub.mutate({ id, patch }),
    [updateSub],
  )
  const deleteSubscription = useCallback(
    (id: string) => deleteSub.mutate(id),
    [deleteSub],
  )
  const logSubscription = useCallback(
    (id: string) => {
      const sub = subscriptions.find((s) => s.id === id)
      if (sub) logSub.mutate(sub)
    },
    [subscriptions, logSub],
  )

  const value = useMemo<StoreValue>(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const accMap = new Map(accounts.map((a) => [a.id, a]))
    return {
      transactions,
      accounts,
      categories,
      budgets,
      subscriptions,
      loading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      deleteTransactions,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      getCategory: (id) => (id ? catMap.get(id) : undefined),
      getAccount: (id) => (id ? accMap.get(id) : undefined),
      addBudget,
      updateBudget,
      deleteBudget,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      logSubscription,
    }
  }, [
    transactions, accounts, categories, budgets, subscriptions, loading,
    addTransaction, updateTransaction, deleteTransaction, deleteTransactions,
    addAccount, updateAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory,
    addBudget, updateBudget, deleteBudget,
    addSubscription, updateSubscription, deleteSubscription, logSubscription,
  ])

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

/** Computed balance = opening balance + all income - all expenses ± transfers */
export function computeBalance(accountId: string, transactions: Transaction[], openingBalance: number): number {
  let balance = openingBalance
  for (const tx of transactions) {
    if (tx.type === 'income' && tx.accountId === accountId) balance += tx.amount
    else if (tx.type === 'expense' && tx.accountId === accountId) balance -= tx.amount
    else if (tx.type === 'transfer') {
      if (tx.accountId === accountId) balance -= tx.amount
      if (tx.toAccountId === accountId) balance += tx.amount
    }
  }
  return balance
}

export type { Account, Budget, Category, Subscription, Transaction, TxType }
