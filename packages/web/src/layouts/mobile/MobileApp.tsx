import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, CalendarClock, Home, Plus, Settings, Wallet } from 'lucide-react'
import { useState } from 'react'
import { TransactionRouteOverlay } from '@/features/transactions/components/TransactionRouteOverlay'
import { MobileQuickAddTransactionSheet } from '@/features/transactions/components/MobileQuickAddTransactionSheet'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { useLang } from '@/core/i18n'
import { AppRouteContent } from '@/routing/app-pages'
import { useTransactions } from '@/features/transactions/queries'
import { useSubscriptions } from '@/features/subscriptions/queries'
import { useAppDataLoading } from '@/shared/hooks/useAppDataLoading'
import { dueBanner } from '@/features/subscriptions/helpers'
import { cn } from '@/shared/lib/utils'
import { isPlanningSection, isSettingsSection, sectionFromPath } from '@/routing/app-route-state'
import { getTransactionOverlayState } from '@/routing/transaction-overlay'

export function MobileApp() {
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: transactions = [] } = useTransactions()
  const loading = useAppDataLoading()
  const { t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const overlay = getTransactionOverlayState(
    location.pathname,
    location.search as Record<string, unknown>,
  )
  const section = sectionFromPath(overlay?.returnToPathname ?? location.pathname)
  const dueCount = dueBanner(subscriptions, transactions).length

  const title =
    section === 'transactions'
      ? t('nav.transactions')
      : section === 'accounts'
        ? t('nav.accounts')
        : section === 'settings'
          ? t('nav.settings')
          : section === 'settings-categories'
            ? t('settings.categories')
            : isPlanningSection(section)
              ? t('nav.planning')
              : t('nav.dashboard')

  const NAV: { href: '/' | '/transactions' | '/budgets' | '/accounts'; label: string; icon: typeof Home; active: boolean; badge?: number }[] = [
    { href: '/', label: t('nav.home'), icon: Home, active: section === 'dashboard' },
    { href: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight, active: section === 'transactions' },
    { href: '/budgets', label: t('nav.planning'), icon: CalendarClock, active: isPlanningSection(section), badge: dueCount },
    { href: '/accounts', label: t('nav.accounts'), icon: Wallet, active: section === 'accounts' },
  ]

  if (loading) return <LoadingScreen />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ to: isSettingsSection(section) ? '/' : '/settings' })}
            aria-label={t('nav.settings')}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
              isSettingsSection(section)
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
        {overlay ? <AppRouteContent pathname={overlay.returnToPathname} /> : <Outlet />}
      </main>

      {/* Bottom nav with center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
        <div className="relative border-t border-border bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <div className="grid grid-cols-5 items-center">
            {NAV.slice(0, 2).map((n) => (
              <NavButton key={n.href} label={n.label} icon={n.icon} active={n.active} onClick={() => navigate({ to: n.href })} badge={n.badge} />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                aria-label={t('app.addTransaction')}
                className="-mt-7 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" />
              </button>
            </div>
            {NAV.slice(2).map((n) => (
              <NavButton key={n.href} label={n.label} icon={n.icon} active={n.active} onClick={() => navigate({ to: n.href })} badge={n.badge} />
            ))}
          </div>
        </div>
      </nav>

      <TransactionRouteOverlay variant="mobile" overlay={overlay} />
      <MobileQuickAddTransactionSheet
        open={isQuickAddOpen}
        returnTo={location.href}
        onClose={() => setIsQuickAddOpen(false)}
      />
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
