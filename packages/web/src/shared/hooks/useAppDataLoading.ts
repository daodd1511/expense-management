import { useAccounts } from '@/features/accounts/queries'
import { useBudgets } from '@/features/budgets/queries'
import { useCategories } from '@/features/categories/queries'
import { useFavorites } from '@/features/categories/favorites-queries'
import { useSubscriptions } from '@/features/subscriptions/queries'
import { useTransactions } from '@/features/transactions/queries'

/** True while any of the app's top-level data queries are on their initial load. */
export function useAppDataLoading(): boolean {
  const txQuery = useTransactions()
  const accQuery = useAccounts()
  const catQuery = useCategories()
  const favQuery = useFavorites()
  const budgetQuery = useBudgets()
  const subQuery = useSubscriptions()

  return (
    txQuery.isLoading ||
    accQuery.isLoading ||
    catQuery.isLoading ||
    favQuery.isLoading ||
    budgetQuery.isLoading ||
    subQuery.isLoading
  )
}
