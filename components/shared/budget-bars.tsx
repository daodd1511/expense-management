'use client'

import { CategoryIcon, colorVar } from '@/components/category-icon'
import { Progress } from '@/components/ui/progress'
import { formatVND } from '@/lib/format'
import { spentForCategory, useStore } from '@/lib/store'

export function budgetState(pct: number) {
  if (pct >= 100) return { label: 'Vượt', tone: 'text-expense', bar: 'bg-expense' }
  if (pct >= 80) return { label: 'Gần hết', tone: 'text-chart-3', bar: 'bg-chart-3' }
  return { label: 'Còn dư', tone: 'text-income', bar: 'bg-income' }
}

export function BudgetBars({ limit }: { limit?: number }) {
  const { budgets, transactions, getCategory } = useStore()
  const list = limit ? budgets.slice(0, limit) : budgets

  return (
    <ul className="flex flex-col gap-4">
      {list.map((b) => {
        const cat = getCategory(b.categoryId)
        const spent = spentForCategory(transactions, b.categoryId)
        const pct = Math.round((spent / b.limit) * 100)
        const state = budgetState(pct)
        const remaining = b.limit - spent
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
              <span className={`text-xs font-medium ${state.tone}`}>{state.label} · {pct}%</span>
            </div>
            <Progress value={pct} indicatorClassName={state.bar} />
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
              <span>{formatVND(spent)}</span>
              <span>
                {remaining >= 0 ? `Còn ${formatVND(remaining)}` : `Vượt ${formatVND(-remaining)}`}{' '}
                / {formatVND(b.limit)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
