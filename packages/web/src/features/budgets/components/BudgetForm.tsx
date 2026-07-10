
import { useState } from 'react'
import { FavoriteCategoryPicker } from '@/features/categories/components/FavoriteCategoryPicker'
import { AmountField } from '@/shared/components/AmountField'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { FormFooterBar } from '@/shared/components/FormFooterBar'
import { SheetFormHeader } from '@/shared/components/SheetFormHeader'
import { Label } from '@/shared/components/ui/input'
import { useFormSubmit } from '@/shared/hooks/useFormSubmit'
import { useLang } from '@/core/i18n'
import { useCategories } from '@/features/categories/queries'
import { useFavoriteCategoryIds } from '@/features/categories/favorites-queries'
import { useBudgets } from '@/features/budgets/queries'
import type { Budget, Category } from '@/core/types'

interface BudgetFormProps {
  initial?: Budget
  onSubmit: (b: Budget) => Promise<void>
  onCancel: () => void
}

/**
 * A category may only be budgeted at the leaf level or at its own
 * parent-direct level, never both in the same branch: if its parent already
 * has a budget, or any of its children already has one, it's excluded.
 */
export function conflictsWithExistingBudget(
  candidate: Category,
  categories: Category[],
  budgets: Budget[],
  excludeCategoryId?: string,
) {
  const activeBudgets = budgets.filter((b) => b.categoryId !== excludeCategoryId)
  if (activeBudgets.some((b) => b.categoryId === candidate.id)) return true
  if (candidate.parentId && activeBudgets.some((b) => b.categoryId === candidate.parentId)) return true
  const childIds = categories.filter((c) => c.parentId === candidate.id).map((c) => c.id)
  return childIds.length > 0 && activeBudgets.some((b) => childIds.includes(b.categoryId))
}

export function BudgetForm({ initial, onSubmit, onCancel }: BudgetFormProps) {
  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets()
  const favoriteCategoryIds = useFavoriteCategoryIds()
  const { t } = useLang()

  const availableCategories = categories.filter(
    (c) => !c.isHidden && !conflictsWithExistingBudget(c, categories, budgets, initial?.categoryId),
  )

  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [amount, setAmount] = useState(initial ? String(initial.limit) : '')

  const numericAmount = Number(amount) || 0
  const canSubmit = !!categoryId && numericAmount > 0

  const { submit, isSubmitting, errorMessage } = useFormSubmit(onSubmit)

  const handleSubmit = () => {
    if (!categoryId) return
    submit({ categoryId, limit: numericAmount })
  }

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={initial ? t('budget.edit') : t('budget.add')}
        onClose={onCancel}
        closeLabel={t('form.close')}
      />

      <AmountField label={t('budget.limit')} value={amount} onChange={setAmount} />

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label>{t('budget.category')}</Label>
          <FavoriteCategoryPicker
            categories={availableCategories}
            favoriteCategoryIds={favoriteCategoryIds}
            selectedId={categoryId}
            onSelect={(id) => setCategoryId(id || null)}
            disabled={!!initial}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="px-4 pt-3 sm:px-5">
          <FormErrorBanner message={errorMessage} />
        </div>
      )}

      <FormFooterBar
        cancelLabel={t('form.cancel')}
        onCancel={onCancel}
        submitLabel={initial ? t('form.save') : t('budget.add')}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
