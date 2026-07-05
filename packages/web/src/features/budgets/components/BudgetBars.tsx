
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Progress } from '@/shared/components/ui/progress'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { spentForCategory } from '@/shared/lib/derive'
import { useBudgets } from '@/features/budgets/queries'
import { useCategoryLookup } from '@/features/categories/queries'
import { useTransactions } from '@/features/transactions/queries'

export function budgetState(pct: number) {
  if (pct >= 100) return { tone: 'text-expense', bar: 'bg-expense' }
  if (pct >= 80) return { tone: 'text-chart-3', bar: 'bg-chart-3' }
  return { tone: 'text-income', bar: 'bg-income' }
}

export function BudgetBars({ limit }: { limit?: number }) {
  const { data: budgets = [] } = useBudgets()
  const { data: transactions = [] } = useTransactions()
  const getCategory = useCategoryLookup()
  const { t } = useLang()
  const list = limit ? budgets.slice(0, limit) : budgets

  return (
    <ul className="flex flex-col gap-4">
      {list.map((b) => {
        const cat = getCategory(b.categoryId)
        const spent = spentForCategory(transactions, b.categoryId)
        const pct = Math.round((spent / b.limit) * 100)
        const state = budgetState(pct)
        const remaining = b.limit - spent
        const stateLabel = pct >= 100 ? t('budget.stateOver') : pct >= 80 ? t('budget.stateNear') : t('budget.stateOk')
        const remainingLabel = remaining >= 0
          ? t('budget.remaining', { amount: formatVND(remaining) })
          : t('budget.overAmount', { amount: formatVND(-remaining) })
        return (
          <li key={b.categoryId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
                <span className="text-sm font-medium">{cat?.name}</span>
              </div>
              <span className={`text-xs font-medium ${state.tone}`}>{stateLabel} · {pct}%</span>
            </div>
            <Progress value={pct} indicatorClassName={state.bar} />
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
              <span>{formatVND(spent)}</span>
              <span>{remainingLabel} / {formatVND(b.limit)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
