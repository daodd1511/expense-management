
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { BudgetForm } from '@/features/budgets/components/BudgetForm'
import { budgetState } from '@/features/budgets/components/BudgetBars'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { BudgetsSkeleton } from '@/shared/components/Skeleton'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { Progress } from '@/shared/components/ui/progress'
import { MobilePageContainer } from '@/shared/components/MobilePageContainer'
import { useSwipeActions } from '@/shared/hooks/useSwipeActions'
import { formatVND, monthLabel } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { spentForCategory } from '@/shared/lib/derive'
import { useAddBudget, useBudgets, useDeleteBudget, useUpdateBudget } from '@/features/budgets/queries'
import { useCategoryLookup } from '@/features/categories/queries'
import { useTransactions } from '@/features/transactions/queries'
import type { Budget, Category } from '@/core/types'

const SWIPE_ACTION_WIDTH = 148

function BudgetRow({
  budget,
  category,
  spent,
  percent,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  budget: Budget
  category: Category | undefined
  spent: number
  percent: number
  onEdit: () => void
  onDelete: () => void
  editLabel: string
  deleteLabel: string
}) {
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH)
  const state = budgetState(percent)

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="flex w-[74px] items-center justify-center bg-accent text-accent-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={deleteLabel}
          className="flex w-[74px] items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div
        className="touch-pan-y flex flex-col gap-1.5 bg-card py-3"
        style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
        {...bind}
      >
        <button type="button" onClick={onEdit} className="flex items-center justify-between gap-2 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklab, ${colorVar(category?.color ?? 'chart-1')} 18%, transparent)` }}
            >
              <CategoryIcon name={category?.icon} className="size-3.5" style={{ color: colorVar(category?.color ?? 'chart-1') }} />
            </span>
            {category?.name}
          </span>
          <span className={`text-xs font-medium ${state.tone}`}>{percent}%</span>
        </button>
        <Progress value={percent} indicatorClassName={state.bar} />
        <div className="flex justify-between text-xs text-muted-foreground tabular">
          <span>{formatVND(spent)}</span>
          <span>{formatVND(budget.limit)}</span>
        </div>
      </div>
    </div>
  )
}

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
    <MobilePageContainer>
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

      {budgets.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight">{t('budget.perCategory')}</h2>
          </CardContent>
          <div className="flex flex-col divide-y divide-border px-4">
            {budgets.map((b) => {
              const cat = getCategory(b.categoryId)
              const spent = spentForCategory(transactions, b.categoryId)
              const percent = Math.round((spent / b.limit) * 100)
              return (
                <BudgetRow
                  key={b.categoryId}
                  budget={b}
                  category={cat}
                  spent={spent}
                  percent={percent}
                  onEdit={() => setSheet(b)}
                  onDelete={() => setPendingDeleteId(b.categoryId)}
                  editLabel={t('budget.edit')}
                  deleteLabel={t('confirm.delete')}
                />
              )
            })}
          </div>
          <div className="pb-1" />
        </Card>
      )}

      <button
        type="button"
        onClick={() => setSheet('add')}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-4" /> {t('budget.add')}
      </button>

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
    </MobilePageContainer>
  )
}
