
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { BudgetForm } from '@/features/budgets/components/BudgetForm'
import { budgetState } from '@/features/budgets/components/BudgetBars'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { Progress } from '@/shared/components/ui/progress'
import { formatVND, monthLabel } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { spentForCategory, useStore } from '@/core/store'
import type { Budget } from '@/core/types'

export function DesktopBudgets() {
  const { budgets, transactions, getCategory, addBudget, updateBudget, deleteBudget } = useStore()
  const { t, lang } = useLang()
  const [editing, setEditing] = useState<Budget | 'add' | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + spentForCategory(transactions, b.categoryId), 0)
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
  const over = budgets.filter((b) => spentForCategory(transactions, b.categoryId) >= b.limit).length

  const handleSubmit = async (b: Budget) => {
    if (editing === 'add') await addBudget(b)
    else await updateBudget(b.categoryId, b.limit)
    setEditing(null)
  }

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

        {editing !== null && (
          <Card>
            <CardHeader>
              <CardTitle>{editing === 'add' ? t('budget.add') : t('budget.edit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetForm
                initial={editing === 'add' ? undefined : editing}
                onSubmit={handleSubmit}
                onCancel={() => setEditing(null)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('budget.byCategory')}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing('add')}>
            <Plus className="size-3.5" />
            {t('budget.add')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
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
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-medium ${state.tone}`}>{p}%</span>
                      <button
                        type="button"
                        onClick={() => setEditing(b)}
                        className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(b.categoryId)}
                        className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-expense"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <Progress value={p} indicatorClassName={state.bar} />
                  <div className="flex justify-between text-xs text-muted-foreground tabular">
                    <span>{formatVND(spent)}</span>
                    <span>{formatVND(b.limit)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteBudget(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
