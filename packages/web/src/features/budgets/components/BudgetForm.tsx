
import { useState } from 'react'
import { FavoriteCategoryPicker } from '@/features/categories/components/FavoriteCategoryPicker'
import { Button } from '@/shared/components/ui/button'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { Input, Label } from '@/shared/components/ui/input'
import { formatVND } from '@/shared/lib/format'
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
    (c) => !conflictsWithExistingBudget(c, categories, budgets, initial?.categoryId),
  )

  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? availableCategories[0]?.id ?? null)
  const [amount, setAmount] = useState(initial ? String(initial.limit) : '')

  const numericAmount = Number(amount) || 0
  const canSubmit = !!categoryId && numericAmount > 0

  const { submit, isSubmitting, errorMessage } = useFormSubmit(onSubmit)

  return (
    <div className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="budget-amount">{t('budget.limit')}</Label>
        <Input
          id="budget-amount"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (v.length <= 12) setAmount(v)
          }}
          placeholder="0"
        />
        {numericAmount > 0 && (
          <p className="text-xs text-muted-foreground">{formatVND(numericAmount)}</p>
        )}
      </div>

      {errorMessage && <FormErrorBanner message={errorMessage} />}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" disabled={isSubmitting} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button className="flex-1" disabled={!canSubmit} loading={isSubmitting} onClick={() => categoryId && submit({ categoryId, limit: numericAmount })}>
          {initial ? t('form.save') : t('budget.add')}
        </Button>
      </div>
    </div>
  )
}
