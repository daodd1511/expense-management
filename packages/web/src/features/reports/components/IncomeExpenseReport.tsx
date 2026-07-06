import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { useAccountLookup } from '@/features/accounts/queries'
import { useCategoryLookup } from '@/features/categories/queries'
import { useTransactionOverlay } from '@/features/transactions/transaction-overlay'
import { useLang } from '@/core/i18n'
import { CategoryDonut } from '@/shared/components/Charts'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ReportsSkeleton } from '@/shared/components/Skeleton'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { amountColorClass, formatSigned, formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { useIncomeExpenseReport } from '../queries'
import { monthRangeFromMonth } from '../report-date'
import { ExpenseCategoryBreakdown } from './ExpenseCategoryBreakdown'

export function IncomeExpenseReport({ month }: { month: string }) {
  const { t } = useLang()
  const isDesktop = useIsDesktop()
  const categoryLookup = useCategoryLookup()
  const accountLookup = useAccountLookup()
  const { openEdit } = useTransactionOverlay()
  const { from, to } = monthRangeFromMonth(month)
  const { data, isPending } = useIncomeExpenseReport({ from, to })

  if (isPending || !data) {
    return <ReportsSkeleton mobile={!isDesktop} />
  }

  const report = data.data
  const expenseCategories = report.categories.filter((category) => category.type === 'expense')
  const hasExpenseCategories = expenseCategories.length > 0
  const expenseDonutData = expenseCategories.map((category) => {
    const categoryInfo = categoryLookup(category.categoryId)
    return {
      id: category.categoryId,
      name: categoryInfo?.name ?? category.categoryId,
      value: category.amount,
      percentage: category.percentage,
      color: categoryInfo ? `var(--${categoryInfo.color})` : 'var(--muted-foreground)',
    }
  })

  const handleTransactionClick = (transactionId: string) => {
    openEdit(transactionId, month)
  }

  return (
    <div className="flex flex-col gap-6">
      {isDesktop && (
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={t('reports.totalIncome')}
              value={formatVND(report.totals.income)}
              icon={ArrowDownLeft}
              tone="income"
            />
            <SummaryCard
              label={t('reports.totalExpense')}
              value={formatVND(report.totals.expense)}
              icon={ArrowUpRight}
              tone="expense"
            />
            <SummaryCard
              label={t('reports.totalNet')}
              value={formatSigned(report.totals.net, report.totals.net >= 0 ? 'income' : 'expense')}
              icon={TrendingUp}
              tone={report.totals.net >= 0 ? 'income' : 'expense'}
            />
            <SummaryCard
              label={t('reports.transactionCount')}
              value={t('reports.transactionCountValue', { n: report.totals.transactionCount })}
              icon={TrendingUp}
            />
          </CardContent>
        </Card>
      )}

      {hasExpenseCategories ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-5">
              <div className="w-full">
                <CategoryDonut
                  data={expenseDonutData}
                  total={report.totals.expense}
                  centerLabel={t('reports.expenseDonutCenter')}
                />
              </div>
              <div className="w-full space-y-2">
                {expenseDonutData.slice(0, 5).map((datum) => (
                  <div key={datum.id ?? datum.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.color }} />
                      <span className="truncate">{datum.name}</span>
                    </div>
                    <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                      <span className="text-muted-foreground">{formatVND(datum.value)}</span>
                      <span className="text-xs text-muted-foreground/70">{Math.round(datum.percentage * 100)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ExpenseCategoryBreakdown
            categories={expenseCategories}
            getCategory={categoryLookup}
            getAccount={accountLookup}
            onTransactionClick={handleTransactionClick}
          />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-start justify-center gap-2 p-6">
            <p className="text-sm font-medium">{t('reports.expenseEmptyTitle')}</p>
            <p className="max-w-xl text-sm text-muted-foreground">{t('reports.expenseEmptyDesc')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  tone?: 'income' | 'expense'
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('tabular-nums mt-1 text-lg font-semibold', tone && amountColorClass(tone))}>
            {value}
          </p>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  )
}

