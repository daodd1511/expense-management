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
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  deleteTransactions: (ids: string[]) => Promise<void>
  addAccount: (a: Omit<Account, 'id'>) => Promise<void>
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id'>>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addCategory: (
    c: Pick<Category, 'name' | 'icon' | 'color' | 'type'> & Partial<Pick<Category, 'parentId'>>,
  ) => Promise<void>
  updateCategory: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId'>>,
  ) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addFavorite: (categoryId: string) => Promise<void>
  removeFavorite: (categoryId: string) => Promise<void>
  getCategory: (id: string | null | undefined) => Category | undefined
  getAccount: (id: string | null | undefined) => Account | undefined
  addBudget: (b: Budget) => Promise<void>
  updateBudget: (categoryId: string, limit: number) => Promise<void>
  deleteBudget: (categoryId: string) => Promise<void>
  addSubscription: (s: Omit<Subscription, 'id'>) => Promise<void>
  updateSubscription: (id: string, patch: Partial<Omit<Subscription, 'id'>>) => Promise<void>
  deleteSubscription: (id: string) => Promise<void>
  logSubscription: (id: string) => Promise<void>
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
    async (t: Omit<Transaction, 'id'>) => {
      await addTx.mutateAsync(t)
    },
    [addTx],
  )
  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Transaction>) => {
      await updateTx.mutateAsync({ id, patch })
    },
    [updateTx],
  )
  const deleteTransaction = useCallback(
    async (id: string) => {
      await deleteTx.mutateAsync(id)
    },
    [deleteTx],
  )
  const deleteTransactions = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteTx.mutateAsync(id)))
    },
    [deleteTx],
  )

  const addAccount = useCallback(
    async (a: Omit<Account, 'id'>) => {
      await addAcc.mutateAsync(a)
    },
    [addAcc],
  )
  const updateAccount = useCallback(
    async (id: string, patch: Partial<Omit<Account, 'id'>>) => {
      await updateAcc.mutateAsync({ id, patch })
    },
    [updateAcc],
  )
  const deleteAccount = useCallback(
    async (id: string) => {
      await deleteAcc.mutateAsync(id)
    },
    [deleteAcc],
  )

  const addCategory = useCallback(
    async (c: Pick<Category, 'name' | 'icon' | 'color' | 'type'> & Partial<Pick<Category, 'parentId'>>) => {
      await addCat.mutateAsync(c)
    },
    [addCat],
  )
  const updateCategory = useCallback(
    async (id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId'>>) => {
      await updateCat.mutateAsync({ id, patch })
    },
    [updateCat],
  )
  const deleteCategory = useCallback(
    async (id: string) => {
      await deleteCat.mutateAsync(id)
    },
    [deleteCat],
  )
  const addFavorite = useCallback(
    async (categoryId: string) => {
      await addFav.mutateAsync(categoryId)
    },
    [addFav],
  )
  const removeFavorite = useCallback(
    async (categoryId: string) => {
      await removeFav.mutateAsync(categoryId)
    },
    [removeFav],
  )

  const addBudget = useCallback(
    async (b: Budget) => {
      await addBud.mutateAsync(b)
    },
    [addBud],
  )
  const updateBudget = useCallback(
    async (categoryId: string, limit: number) => {
      await updateBud.mutateAsync({ categoryId, limit })
    },
    [updateBud],
  )
  const deleteBudget = useCallback(
    async (categoryId: string) => {
      await deleteBud.mutateAsync(categoryId)
    },
    [deleteBud],
  )

  const addSubscription = useCallback(
    async (s: Omit<Subscription, 'id'>) => {
      await addSub.mutateAsync(s)
    },
    [addSub],
  )
  const updateSubscription = useCallback(
    async (id: string, patch: Partial<Omit<Subscription, 'id'>>) => {
      await updateSub.mutateAsync({ id, patch })
    },
    [updateSub],
  )
  const deleteSubscription = useCallback(
    async (id: string) => {
      await deleteSub.mutateAsync(id)
    },
    [deleteSub],
  )
  const logSubscription = useCallback(
    async (id: string) => {
      const sub = subscriptions.find((s: Subscription) => s.id === id)
      if (sub) await logSub.mutateAsync(sub)
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
