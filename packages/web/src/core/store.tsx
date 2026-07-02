import { createContext, useCallback, useContext, useMemo } from 'react'
import {
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/features/accounts/queries'
import {
  useAddCategory,
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/queries'
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from '@/features/categories/favorites-queries'
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/features/transactions/queries'
import {
  useAddBudget,
  useBudgets,
  useDeleteBudget,
  useUpdateBudget,
} from '@/features/budgets/queries'
import {
  useAddSubscription,
  useDeleteSubscription,
  useLogSubscription,
  useSubscriptions,
  useUpdateSubscription,
} from '@/features/subscriptions/queries'
import type { Account, Budget, Category, Subscription, Transaction, TxType } from './types'

export interface StoreValue {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  favoriteCategoryIds: Set<string>
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
  addCategory: (
    c: Pick<Category, 'name' | 'icon' | 'color' | 'type'> & Partial<Pick<Category, 'parentId'>>,
  ) => void
  updateCategory: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId'>>,
  ) => void
  deleteCategory: (id: string) => void
  addFavorite: (categoryId: string) => void
  removeFavorite: (categoryId: string) => void
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
  const favQuery = useFavorites()
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
  const addFav = useAddFavorite()
  const removeFav = useRemoveFavorite()
  const addBud = useAddBudget()
  const updateBud = useUpdateBudget()
  const deleteBud = useDeleteBudget()
  const addSub = useAddSubscription()
  const updateSub = useUpdateSubscription()
  const deleteSub = useDeleteSubscription()
  const logSub = useLogSubscription()

  const transactions: Transaction[] = txQuery.data ?? []
  const accounts: Account[] = accQuery.data ?? []
  const categories: Category[] = catQuery.data ?? []
  const favoriteCategoryIds = useMemo(() => new Set<string>(favQuery.data ?? []), [favQuery.data])
  const budgets: Budget[] = budgetQuery.data ?? []
  const subscriptions: Subscription[] = subQuery.data ?? []

  const loading =
    txQuery.isLoading ||
    accQuery.isLoading ||
    catQuery.isLoading ||
    favQuery.isLoading ||
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
    (c: Pick<Category, 'name' | 'icon' | 'color' | 'type'> & Partial<Pick<Category, 'parentId'>>) =>
      addCat.mutate(c),
    [addCat],
  )
  const updateCategory = useCallback(
    (id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId'>>) =>
      updateCat.mutate({ id, patch }),
    [updateCat],
  )
  const deleteCategory = useCallback(
    (id: string) => deleteCat.mutate(id),
    [deleteCat],
  )
  const addFavorite = useCallback(
    (categoryId: string) => addFav.mutate(categoryId),
    [addFav],
  )
  const removeFavorite = useCallback(
    (categoryId: string) => removeFav.mutate(categoryId),
    [removeFav],
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
      const sub = subscriptions.find((s: Subscription) => s.id === id)
      if (sub) logSub.mutate(sub)
    },
    [subscriptions, logSub],
  )

  const value = useMemo<StoreValue>(() => {
    const catMap = new Map<string, Category>(categories.map((category) => [category.id, category]))
    const accMap = new Map<string, Account>(accounts.map((account) => [account.id, account]))
    return {
      transactions,
      accounts,
      categories,
      favoriteCategoryIds,
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
      addFavorite,
      removeFavorite,
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
    transactions, accounts, categories, favoriteCategoryIds, budgets, subscriptions, loading,
    addTransaction, updateTransaction, deleteTransaction, deleteTransactions,
    addAccount, updateAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory, addFavorite, removeFavorite,
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
