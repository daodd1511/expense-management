
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { Input, Label } from '@/shared/components/ui/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Budget } from '@/core/types'

interface BudgetFormProps {
  initial?: Budget
  onSubmit: (b: Budget) => void
  onCancel: () => void
}

export function BudgetForm({ initial, onSubmit, onCancel }: BudgetFormProps) {
  const { categories, budgets } = useStore()
  const { t } = useLang()

  const availableCategories = categories.filter(
    (c) => !budgets.some((b) => b.categoryId === c.id && b.categoryId !== initial?.categoryId),
  )

  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? availableCategories[0]?.id ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.limit) : '')

  const numericAmount = Number(amount) || 0
  const canSubmit = categoryId && numericAmount > 0
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const selectedCat = categories.find((c) => c.id === categoryId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{t('budget.category')}</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} disabled={!!initial}>
          <SelectTrigger>
            <SelectValue>
              {(v: string | null) =>
                v && selectedCat ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-flex size-5 items-center justify-center rounded"
                      style={{ backgroundColor: colorVar(selectedCat.color) }}
                    >
                      <CategoryIcon name={selectedCat.icon} className="size-3 text-white" />
                    </span>
                    {categoryLabels[v]}
                  </span>
                ) : (
                  t('budget.selectCategory')
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner>
              <SelectPopup>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-flex size-5 items-center justify-center rounded"
                        style={{ backgroundColor: colorVar(c.color) }}
                      >
                        <CategoryIcon name={c.icon} className="size-3 text-white" />
                      </span>
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
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

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button className="flex-1" disabled={!canSubmit} onClick={() => onSubmit({ categoryId, limit: numericAmount })}>
          {initial ? t('form.save') : t('budget.add')}
        </Button>
      </div>
    </div>
  )
}
