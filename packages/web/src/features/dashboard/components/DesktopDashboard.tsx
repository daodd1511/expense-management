
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight, PiggyBank, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DATE_LOCALE } from '@/core/i18n'
import { BalanceTrendChart, CategoryDonut } from '@/shared/components/Charts'
import { AccountList } from '@/features/accounts/components/AccountList'
import { useBalanceTrend } from '@/features/dashboard/queries'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DashboardSkeleton } from '@/shared/components/Skeleton'
import { buildDonutData, monthSummary } from '@/shared/lib/derive'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useTransactions } from '@/features/transactions/queries'
import { todayLocalMonthIso } from '@/shared/lib/date'
import { useCategoryLookup } from '@/features/categories/queries'
import { useAccounts } from '@/features/accounts/queries'
import { useSubscriptions } from '@/features/subscriptions/queries'
import { isDue, isDueSoon, totalMonthlyCost } from '@/features/subscriptions/helpers'
import type { Transaction } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function toTrendLabel(month: string, lang: 'vi' | 'en') {
  const monthIndex = Number(month.slice(5, 7)) - 1
  if (lang === 'vi') return `T${monthIndex + 1}`
  return DATE_LOCALE.en.months[monthIndex].slice(0, 3)
}

export function DesktopDashboard({
  onNavigate,
  onEdit,
}: {
  onNavigate: (section: string, search?: Record<string, string | undefined>) => void
  onEdit: (tx: Transaction) => void
}) {
  const { data: transactions = [], isPending: transactionsPending } = useTransactions()
  const { data: balanceTrend = [], isPending: balanceTrendPending } = useBalanceTrend()
  const { isPending: accountsPending } = useAccounts()
  const { data: subscriptions = [], isPending: subscriptionsPending } = useSubscriptions()
  const getCategory = useCategoryLookup()
  const { t, lang } = useLang()
  const summary = monthSummary(transactions)
  const { data, total } = buildDonutData(transactions, getCategory)
  const savingRate = summary.income > 0 ? Math.round((summary.balance / summary.income) * 100) : 0
  const recent = transactions.slice(0, 6)
  const currentMonth = todayLocalMonthIso()
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active)
  const dueSoonSubscriptions = activeSubscriptions.filter((subscription) => isDue(subscription) || isDueSoon(subscription))
  const monthlySubscriptionCost = totalMonthlyCost(subscriptions)
  const trendData = balanceTrend.map((entry) => ({
    month: toTrendLabel(entry.month, lang),
    balance: entry.balance,
  }))

  const handleCategorySelect = (categoryId?: string) => {
    if (!categoryId) return
    onNavigate('transactions', {
      month: currentMonth,
      categoryId,
    })
  }

  if (transactionsPending || balanceTrendPending || accountsPending || subscriptionsPending) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label={t('dashboard.monthBalance')} value={formatVND(summary.balance)} icon={Wallet} accent />
        <Kpi label={t('dashboard.income')} value={formatVND(summary.income)} icon={ArrowDownLeft} tone="income" />
        <Kpi label={t('dashboard.expense')} value={formatVND(summary.expense)} icon={ArrowUpRight} tone="expense" />
        <Kpi label={t('dashboard.savingsRate')} value={`${savingRate}%`} icon={PiggyBank} />
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('dashboard.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut
              data={data}
              total={total}
              size={200}
              centerLabel={t('reports.expenseDonutCenter')}
              onSelect={(datum) => handleCategorySelect(datum.id)}
            />
            <ul className="mt-4 flex flex-col gap-2">
              {data.map((d) => (
                <li key={d.name}>
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(d.id)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="tabular text-muted-foreground">{formatVND(d.value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.trend6m')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceTrendChart data={trendData} height={260} balanceLabel={t('dashboard.monthBalance')} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('nav.subscriptions')}</CardTitle>
            <Action label={t('dashboard.viewAll')} onClick={() => onNavigate('subscriptions')} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/60 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                {t('sub.monthlyCost')}
              </div>
              <div className="tabular mt-2 text-2xl font-bold tracking-tight">{formatVND(monthlySubscriptionCost)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground">{t('sub.active')}</div>
                <div className="mt-1 text-2xl font-semibold">{activeSubscriptions.length}</div>
              </div>
              <div className="rounded-xl border border-expense/20 bg-expense-muted/20 p-4">
                <div className="text-xs text-expense">{t('sub.dueSoon')}</div>
                <div className="mt-1 text-2xl font-semibold">{dueSoonSubscriptions.length}</div>
              </div>
            </div>
            <div className="space-y-2">
              {dueSoonSubscriptions.slice(0, 3).map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span className="truncate font-medium">{subscription.name}</span>
                  <span className="tabular shrink-0 text-muted-foreground">{formatVND(subscription.amount)}</span>
                </div>
              ))}
              {dueSoonSubscriptions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {t('dashboard.subscriptionsClear')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('dashboard.accounts')}</CardTitle>
            <Action label={t('dashboard.viewAll')} onClick={() => onNavigate('accounts')} />
          </CardHeader>
          <CardContent>
            <AccountList />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('dashboard.recent')}</CardTitle>
            <Action label={t('dashboard.viewAll')} onClick={() => onNavigate('transactions')} />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {recent.map((t) => (
                <TransactionRow key={t.id} tx={t} onClick={() => onEdit(t)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  accent,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'income' | 'expense'
  accent?: boolean
}) {
  return (
    <Card className={cn(accent && 'border-0 bg-primary text-primary-foreground')}>
      <CardContent className="flex min-h-32 items-center gap-3 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn('text-xs', accent ? 'opacity-80' : 'text-muted-foreground')}>{label}</span>
          <span
            className={cn(
              'tabular text-2xl font-bold tracking-tight',
              tone === 'income' && 'text-income',
              tone === 'expense' && 'text-expense',
            )}
          >
            {value}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex size-10 items-center justify-center rounded-xl',
            accent ? 'bg-primary-foreground/15' : 'bg-accent text-accent-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
    >
      {label} <ChevronRight className="size-3.5" />
    </button>
  )
}
