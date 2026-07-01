
import { budgetState } from '@/components/shared/budget-bars'
import { CategoryIcon, colorVar } from '@/components/category-icon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatVND, monthLabel } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import { spentForCategory, useStore } from '@/lib/store'

export function DesktopBudgets() {
  const { budgets, transactions } = useStore()
  const { t, lang } = useLang()
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + spentForCategory(transactions, b.categoryId), 0)
  const pct = Math.round((totalSpent / totalLimit) * 100)
  const over = budgets.filter(
    (b) => spentForCategory(transactions, b.categoryId) >= b.limit,
  ).length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Card>
          <CardContent className="p-5">
            <span className="text-sm text-muted-foreground">{t('budget.total', { month: monthLabel(new Date(), lang) })}</span>
            <div className="tabular mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{formatVND(totalSpent)}</span>
              <span className="text-sm text-muted-foreground">/ {formatVND(totalLimit)}</span>
            </div>
            <Progress value={pct} className="mt-3 h-2.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('budget.used', { pct, remaining: formatVND(Math.max(0, totalLimit - totalSpent)) })}
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <span className="text-xs text-muted-foreground">{t('budget.categories')}</span>
              <div className="mt-1 text-2xl font-bold">{budgets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <span className="text-xs text-muted-foreground">{t('budget.over')}</span>
              <div className="mt-1 text-2xl font-bold text-expense">{over}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('budget.byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <BudgetGrid />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetGrid() {
  const { budgets, transactions, getCategory } = useStore()
  return (
    <>
      {budgets.map((b) => {
        const cat = getCategory(b.categoryId)
        const spent = spentForCategory(transactions, b.categoryId)
        const p = Math.round((spent / b.limit) * 100)
        const state = budgetState(p)
        return (
          <div key={b.categoryId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in oklab, ${colorVar(cat?.color ?? 'chart-1')} 18%, transparent)` }}
                >
                  <CategoryIcon
                    name={cat?.icon}
                    className="size-3.5"
                    style={{ color: colorVar(cat?.color ?? 'chart-1') }}
                  />
                </span>
                {cat?.name}
              </span>
              <span className={`text-xs font-medium ${state.tone}`}>{p}%</span>
            </div>
            <Progress value={p} indicatorClassName={state.bar} />
            <div className="flex justify-between text-xs text-muted-foreground tabular">
              <span>{formatVND(spent)}</span>
              <span>{formatVND(b.limit)}</span>
            </div>
          </div>
        )
      })}
    </>
  )
}
