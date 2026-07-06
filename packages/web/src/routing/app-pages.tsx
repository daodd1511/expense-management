import { startTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { SubscriptionDueBanner } from '@/features/subscriptions/components/SubscriptionDueBanner'
import { useAuth } from '@/features/auth/auth'
import { MobileAccounts } from '@/features/accounts/components/MobileAccounts'
import { DesktopAccounts } from '@/features/accounts/components/DesktopAccounts'
import { DesktopBudgets } from '@/features/budgets/components/DesktopBudgets'
import { CategoriesPage } from '@/features/categories/components/CategoriesPage'
import { DesktopDashboard } from '@/features/dashboard/components/DesktopDashboard'
import { MobileHome } from '@/features/dashboard/components/MobileHome'
import { DesktopSettings } from '@/features/settings/components/Settings'
import { MobileSettings } from '@/features/settings/components/MobileSettings'
import { DesktopSubscriptions } from '@/features/subscriptions/components/DesktopSubscriptions'
import { DesktopTransactionsTable } from '@/features/transactions/components/DesktopTransactionsTable'
import { MobileTransactions } from '@/features/transactions/components/MobileTransactions'
import { MobilePlanning } from '@/layouts/mobile/MobilePlanning'
import { PullToRefreshIndicator } from '@/shared/components/PullToRefreshIndicator'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { usePullToRefresh } from '@/shared/hooks/usePullToRefresh'
import type { Transaction } from '@/core/types'
import { buildTransactionsSearch, parseTransactionsViewState, type TransactionsViewState } from '@/features/transactions/view-state'
import { sectionFromPath } from './app-route-state'
import { validateCreateIntentSearch } from './create-intent'

function useAppNavigation() {
  const navigate = useNavigate()

  return {
    goDashboard: () => navigate({ to: '/' }),
    goTransactions: (search?: Record<string, string | undefined>) => navigate({ to: '/transactions', search }),
    goBudgets: () => navigate({ to: '/budgets' }),
    goSubscriptions: () => navigate({ to: '/subscriptions' }),
    goAccounts: () => navigate({ to: '/accounts' }),
    goSettings: () => navigate({ to: '/settings' }),
    goCategories: () => navigate({ to: '/settings/categories' }),
  }
}

function useTransactionNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return {
    openEdit: (transaction: Transaction) =>
      navigate({
        to: '/transactions/$transactionId/edit',
        params: { transactionId: transaction.id },
        search: { returnTo: location.href },
      }),
  }
}

export function DashboardPage() {
  const isDesktop = useIsDesktop()
  const { openEdit } = useTransactionNavigation()
  const navigation = useAppNavigation()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const pullToRefresh = usePullToRefresh({
    enabled: isDesktop === false,
    onRefresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['categories', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
      ])
    },
  })

  if (isDesktop) {
    return (
      <DesktopDashboard
        onNavigate={(section, search) => {
          if (section === 'budgets') navigation.goBudgets()
          else if (section === 'subscriptions') navigation.goSubscriptions()
          else if (section === 'accounts') navigation.goAccounts()
          else if (section === 'transactions') navigation.goTransactions(search)
        }}
        onEdit={openEdit}
      />
    )
  }

  return (
    <div {...pullToRefresh.bind} className="h-full overflow-y-auto overscroll-contain">
      <PullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        isArmed={pullToRefresh.isArmed}
        isRefreshing={pullToRefresh.isRefreshing}
      />
      <div
        style={{
          transform: `translateY(${pullToRefresh.pullDistance}px)`,
          transition: 'transform var(--duration-base) var(--ease-out)',
        }}
      >
        <SubscriptionDueBanner confirmVariant="sheet" />
        <MobileHome
          onNavigate={(section, search) => {
            if (section === 'budgets') navigation.goBudgets()
            else if (section === 'subscriptions') navigation.goSubscriptions()
            else if (section === 'accounts') navigation.goAccounts()
            else if (section === 'transactions') navigation.goTransactions(search)
          }}
          onEdit={openEdit}
        />
      </div>
    </div>
  )
}

export function TransactionsPage() {
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const navigate = useNavigate()
  const { openEdit } = useTransactionNavigation()
  const rawSearch = location.search as Record<string, unknown>
  const state = parseTransactionsViewState(rawSearch)
  const shouldFocusSearch = rawSearch.focus === 'search'

  const updateTransactionsState = (
    patch: Partial<TransactionsViewState> | ((current: TransactionsViewState) => TransactionsViewState),
  ) => {
    const nextState =
      typeof patch === 'function'
        ? patch(state)
        : { ...state, ...patch }
    startTransition(() => {
      void navigate({
        to: '/transactions',
        search: buildTransactionsSearch(nextState),
        replace: true,
      })
    })
  }

  return isDesktop ? (
    <DesktopTransactionsTable
      onEdit={openEdit}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryId={state.categoryId}
      accountId={state.accountId}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryId) => updateTransactionsState({ categoryId })}
      onAccountChange={(accountId) => updateTransactionsState({ accountId })}
      shouldFocusSearch={shouldFocusSearch}
      onSearchFocusHandled={() =>
        navigate({ to: '/transactions', search: buildTransactionsSearch(state), replace: true })
      }
    />
  ) : (
    <MobileTransactions
      onEdit={openEdit}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryId={state.categoryId}
      accountId={state.accountId}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryId) => updateTransactionsState({ categoryId })}
      onAccountChange={(accountId) => updateTransactionsState({ accountId })}
    />
  )
}

/** `createIntentToken`/`onCreateIntentHandled` for a desktop page reached via a `?create=`
 * URL token (the command palette's "New account/budget/subscription" actions). */
function useCreateIntent(path: '/accounts' | '/budgets' | '/subscriptions') {
  const location = useLocation()
  const navigate = useNavigate()
  const { create } = validateCreateIntentSearch(location.search as Record<string, unknown>)

  return {
    createIntentToken: create,
    onCreateIntentHandled: () => navigate({ to: path, search: {}, replace: true }),
  }
}

export function BudgetsPage() {
  const isDesktop = useIsDesktop()
  const navigation = useAppNavigation()
  const createIntent = useCreateIntent('/budgets')

  return isDesktop ? (
    <DesktopBudgets {...createIntent} />
  ) : (
    <MobilePlanning tab="budgets" onTabChange={(tab) => (tab === 'budgets' ? navigation.goBudgets() : navigation.goSubscriptions())} />
  )
}

export function SubscriptionsPage() {
  const isDesktop = useIsDesktop()
  const navigation = useAppNavigation()
  const createIntent = useCreateIntent('/subscriptions')

  return isDesktop ? (
    <DesktopSubscriptions {...createIntent} />
  ) : (
    <MobilePlanning
      tab="subscriptions"
      onTabChange={(tab) => (tab === 'budgets' ? navigation.goBudgets() : navigation.goSubscriptions())}
    />
  )
}

export function AccountsPage() {
  const isDesktop = useIsDesktop()
  const createIntent = useCreateIntent('/accounts')

  return isDesktop ? <DesktopAccounts {...createIntent} /> : <MobileAccounts />
}

export function SettingsPage() {
  const isDesktop = useIsDesktop()
  const navigation = useAppNavigation()

  return isDesktop ? (
    <DesktopSettings onNavigateToCategories={navigation.goCategories} />
  ) : (
    <MobileSettings onNavigateToCategories={navigation.goCategories} />
  )
}

export function SettingsCategoriesPage() {
  const isDesktop = useIsDesktop()
  const navigation = useAppNavigation()

  return (
    <CategoriesPage
      variant={isDesktop ? 'desktop' : 'mobile'}
      onBack={navigation.goSettings}
    />
  )
}

export function AppRouteContent({ pathname }: { pathname: string }) {
  const section = sectionFromPath(pathname)

  switch (section) {
    case 'transactions':
      return <TransactionsPage />
    case 'budgets':
      return <BudgetsPage />
    case 'subscriptions':
      return <SubscriptionsPage />
    case 'accounts':
      return <AccountsPage />
    case 'settings':
      return <SettingsPage />
    case 'settings-categories':
      return <SettingsCategoriesPage />
    default:
      return <DashboardPage />
  }
}
