'use client'

import { BudgetBars } from '@/components/shared/budget-bars'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatVND, monthLabel } from '@/lib/format'
import { useStore } from '@/lib/store'
import { spentForCategory } from '@/lib/store'

export function MobileBudgets() {
  const { budgets, transactions } = useStore()
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + spentForCategory(transactions, b.categoryId), 0)
  const pct = Math.round((totalSpent / totalLimit) * 100)

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardContent className="p-5">
          <span className="text-sm text-muted-foreground">Tổng ngân sách · {monthLabel(new Date())}</span>
          <div className="tabular mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{formatVND(totalSpent)}</span>
            <span className="text-sm text-muted-foreground">/ {formatVND(totalLimit)}</span>
          </div>
          <Progress value={pct} className="mt-3 h-2.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            Đã dùng {pct}% · còn lại {formatVND(Math.max(0, totalLimit - totalSpent))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">Theo danh mục</h2>
          <BudgetBars />
        </CardContent>
      </Card>
    </div>
  )
}
