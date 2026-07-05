
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, CalendarClock, Home, Plus, Settings, Wallet } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import { SubscriptionDueBanner } from '@/features/subscriptions/components/SubscriptionDueBanner'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { PullToRefreshIndicator } from '@/shared/components/PullToRefreshIndicator'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { usePullToRefresh } from '@/shared/hooks/usePullToRefresh'
import { useLang } from '@/core/i18n'
import { useAddTransaction, useTransactions, useUpdateTransaction } from '@/features/transactions/queries'
import { useSubscriptions } from '@/features/subscriptions/queries'
import { useAppDataLoading } from '@/shared/hooks/useAppDataLoading'
import { dueBanner } from '@/features/subscriptions/helpers'
import type { Transaction } from '@/core/types'
import { cn } from '@/shared/lib/utils'
import { MobileAccounts } from '@/features/accounts/components/MobileAccounts'
import { MobileHome } from '@/features/dashboard/components/MobileHome'
import { MobilePlanning } from '@/layouts/mobile/MobilePlanning'
import { MobileSettings } from '@/features/settings/components/MobileSettings'
import { MobileTransactions } from '@/features/transactions/components/MobileTransactions'
import { CategoriesPage } from '@/features/categories/components/CategoriesPage'
import { useAuth } from '@/features/auth/auth'

type Screen = 'home' | 'transactions' | 'planning' | 'accounts' | 'settings' | 'categories'

export function MobileApp() {
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: transactions = [] } = useTransactions()
  const addTx = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const loading = useAppDataLoading()
  const { user } = useAuth()
  const { t } = useLang()
  const queryClient = useQueryClient()
  const [screen, setScreen] = useState<Screen>('home')
  const dueCount = dueBanner(subscriptions, transactions).length
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const TITLES: Record<Screen, string> = {
    home: t('nav.dashboard'),
    transactions: t('nav.transactions'),
    planning: t('nav.planning'),
    accounts: t('nav.accounts'),
    settings: t('nav.settings'),
    categories: t('settings.categories'),
  }

  const NAV: { screen: Screen; label: string; icon: typeof Home; badge?: number }[] = [
    { screen: 'home', label: t('nav.home'), icon: Home },
    { screen: 'transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { screen: 'planning', label: t('nav.planning'), icon: CalendarClock, badge: dueCount },
    { screen: 'accounts', label: t('nav.accounts'), icon: Wallet },
  ]

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setSheetOpen(true)
  }
  const close = () => {
    setSheetOpen(false)
    setEditing(null)
  }

  const homePullToRefresh = usePullToRefresh({
    enabled: screen === 'home',
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

  if (loading) return <LoadingScreen />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{TITLES[screen]}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScreen(screen === 'settings' ? 'home' : 'settings')}
            aria-label={t('nav.settings')}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
              screen === 'settings'
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      {/* Screen */}
      <main className="flex-1 pb-24">
        {screen === 'home' && (
          <div
            {...homePullToRefresh.bind}
            className="h-full overflow-y-auto overscroll-contain"
          >
            <PullToRefreshIndicator
              pullDistance={homePullToRefresh.pullDistance}
              isArmed={homePullToRefresh.isArmed}
              isRefreshing={homePullToRefresh.isRefreshing}
            />
            <div
              style={{
                transform: `translateY(${homePullToRefresh.pullDistance}px)`,
                transition: 'transform var(--duration-base) var(--ease-out)',
              }}
            >
              <SubscriptionDueBanner />
              <MobileHome onNavigate={(s) => setScreen(s as Screen)} onEdit={openEdit} />
            </div>
          </div>
        )}
        {screen === 'transactions' && <MobileTransactions onEdit={openEdit} />}
        {screen === 'planning' && <MobilePlanning />}
        {screen === 'accounts' && <MobileAccounts />}
        {screen === 'settings' && <MobileSettings onNavigateToCategories={() => setScreen('categories')} />}
        {screen === 'categories' && <CategoriesPage variant="mobile" onBack={() => setScreen('settings')} />}
      </main>

      {/* Bottom nav with center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
        <div className="relative border-t border-border bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <div className="grid grid-cols-5 items-center">
            {NAV.slice(0, 2).map((n) => (
              <NavButton key={n.screen} {...n} active={screen === n.screen} onClick={() => setScreen(n.screen)} badge={n.badge} />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openAdd}
                aria-label={t('app.addTransaction')}
                className="-mt-7 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" />
              </button>
            </div>
            {NAV.slice(2).map((n) => (
              <NavButton key={n.screen} {...n} active={screen === n.screen} onClick={() => setScreen(n.screen)} badge={n.badge} />
            ))}
          </div>
        </div>
      </nav>

      <BottomSheet open={sheetOpen} onClose={close} title={editing ? t('form.editTitle') : t('form.addTitle')}>
        {sheetOpen && (
          <TransactionForm
            variant="mobile"
            initial={editing ?? undefined}
            onCancel={close}
            onSubmit={async (tx) => {
              if (editing) await updateTx.mutateAsync({ id: editing.id, patch: tx })
              else await addTx.mutateAsync(tx)
              close()
            }}
          />
        )}
      </BottomSheet>
    </div>
  )
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string
  icon: typeof Home
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-1 text-[0.65rem] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <span className="relative">
        <Icon className={cn('size-5', active && 'fill-primary/15')} />
        {badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1 inline-flex size-3.5 items-center justify-center rounded-full bg-expense text-[0.5rem] font-bold text-expense-foreground">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  )
}
