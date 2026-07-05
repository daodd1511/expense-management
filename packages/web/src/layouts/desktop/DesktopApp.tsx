
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import {
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings,
  Target,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import { Drawer } from '@/shared/components/ui/overlay'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { useLang } from '@/core/i18n'
import { useAddTransaction, useTransactions, useUpdateTransaction } from '@/features/transactions/queries'
import { useSubscriptions } from '@/features/subscriptions/queries'
import { useAppDataLoading } from '@/shared/hooks/useAppDataLoading'
import { dueBanner } from '@/features/subscriptions/helpers'
import type { Transaction } from '@/core/types'
import { cn } from '@/shared/lib/utils'
import { sectionFromPath } from '@/routing/app-route-state'
import { TransactionOverlayProvider } from '@/layouts/TransactionOverlayContext'

export function DesktopApp() {
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: transactions = [] } = useTransactions()
  const addTx = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const loading = useAppDataLoading()
  const { t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const section = sectionFromPath(location.pathname)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const dueCount = dueBanner(subscriptions, transactions).length

  const NAV: { href: '/' | '/transactions' | '/budgets' | '/subscriptions' | '/accounts' | '/settings'; section: typeof section; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { href: '/', section: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/transactions', section: 'transactions', label: t('nav.transactions'), icon: Receipt },
    { href: '/budgets', section: 'budgets', label: t('nav.budgets'), icon: Target },
    { href: '/subscriptions', section: 'subscriptions', label: t('nav.subscriptions'), icon: CalendarClock, badge: dueCount },
    { href: '/accounts', section: 'accounts', label: t('nav.accounts'), icon: Wallet },
    { href: '/settings', section: 'settings', label: t('nav.settings'), icon: Settings },
  ]

  const openAdd = () => {
    setEditing(undefined)
    setDrawerOpen(true)
  }
  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setDrawerOpen(true)
  }

  if (loading) return <LoadingScreen />

  return (
    <TransactionOverlayProvider value={{ openAdd, openEdit }}>
      <div className="flex min-h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{t('app.name')}</p>
            <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = item.section === 'settings' ? section === 'settings' || section === 'settings-categories' : section === item.section
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate({ to: item.href })}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="size-4.5" />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 inline-flex size-3.5 items-center justify-center rounded-full bg-expense text-[0.5rem] font-bold text-expense-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={openAdd}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t('app.addTransaction')}
        </button>

        <div className="mt-auto flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">{t('settings.appearance')}</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden px-5 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawerOpen && (
          <TransactionForm
            variant="desktop"
            initial={editing}
            onSubmit={async (tx) => {
              if (editing) await updateTx.mutateAsync({ id: editing.id, patch: tx })
              else await addTx.mutateAsync(tx)
              setDrawerOpen(false)
            }}
            onCancel={() => setDrawerOpen(false)}
          />
        )}
      </Drawer>
      </div>
    </TransactionOverlayProvider>
  )
}
