
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { BudgetForm } from '@/features/budgets/components/BudgetForm'
import { budgetState } from '@/features/budgets/components/BudgetBars'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { BudgetsSkeleton } from '@/shared/components/Skeleton'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { Progress } from '@/shared/components/ui/progress'
import { formatVND, monthLabel } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { spentForCategory } from '@/shared/lib/derive'
import { useAddBudget, useBudgets, useDeleteBudget, useUpdateBudget } from '@/features/budgets/queries'
import { useCategoryLookup } from '@/features/categories/queries'
import { useTransactions } from '@/features/transactions/queries'
import type { Budget } from '@/core/types'

export function MobileBudgets() {
  const { data: budgets = [], isPending: budgetsPending } = useBudgets()
  const { data: transactions = [], isPending: transactionsPending } = useTransactions()
  const getCategory = useCategoryLookup()
  const addBud = useAddBudget()
  const updateBud = useUpdateBudget()
  const deleteBud = useDeleteBudget()
  const { t, lang } = useLang()
  const [sheet, setSheet] = useState<'add' | Budget | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + spentForCategory(transactions, b.categoryId), 0)
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0

  const handleSubmit = async (b: Budget) => {
    if (sheet === 'add') await addBud.mutateAsync(b)
    else await updateBud.mutateAsync(b)
    setSheet(null)
  }

  if (budgetsPending || transactionsPending) return <BudgetsSkeleton mobile />

  return (
    <div className="flex flex-col gap-4 p-4">
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

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('budget.perCategory')}</h2>
        <Button size="sm" variant="outline" onClick={() => setSheet('add')}>
          <Plus className="size-3.5" />
          {t('budget.add')}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {budgets.map((b) => {
          const cat = getCategory(b.categoryId)
          const spent = spentForCategory(transactions, b.categoryId)
          const p = Math.round((spent / b.limit) * 100)
          const state = budgetState(p)
          return (
            <Card key={b.categoryId}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="inline-flex size-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklab, ${colorVar(cat?.color ?? 'chart-1')} 18%, transparent)` }}
                    >
                      <CategoryIcon name={cat?.icon} className="size-3.5" style={{ color: colorVar(cat?.color ?? 'chart-1') }} />
                    </span>
                    {cat?.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${state.tone}`}>{p}%</span>
                    <button
                      type="button"
                      onClick={() => setSheet(b)}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
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
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular">
                  <span>{formatVND(spent)}</span>
                  <span>{formatVND(b.limit)}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'add' ? t('budget.add') : t('budget.edit')}
      >
        {sheet !== null && (
          <BudgetForm
            initial={sheet === 'add' ? undefined : sheet}
            onSubmit={handleSubmit}
            onCancel={() => setSheet(null)}
          />
        )}
      </BottomSheet>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteBud.mutateAsync(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
