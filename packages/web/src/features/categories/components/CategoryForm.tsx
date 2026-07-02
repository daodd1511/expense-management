
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { Input, Label } from '@/shared/components/ui/input'
import { useLang } from '@/core/i18n'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

const COLOR_OPTIONS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'income', 'expense'] as const

const ICON_OPTIONS = [
  'Utensils',
  'Bus',
  'House',
  'ReceiptText',
  'Gamepad2',
  'HeartPulse',
  'ShoppingBag',
  'Briefcase',
  'Gift',
  'Tag',
] as const

export interface CategoryFormState {
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
}

const EMPTY_CATEGORY: CategoryFormState = {
  name: '',
  icon: 'Tag',
  color: 'chart-1',
  type: 'expense',
}

export function toFormState(category: Category | undefined): CategoryFormState {
  if (!category) return EMPTY_CATEGORY
  return {
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
  }
}

export function CategoryForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial?: Category
  onSave: (form: CategoryFormState) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const { t } = useLang()
  const [form, setForm] = useState<CategoryFormState>(() => toFormState(initial))
  const isEditing = !!initial

  const canDelete = isEditing && !initial?.isSystem
  const canSave = form.name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-2 pb-4 sm:px-5">
        <span
          className="inline-flex size-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: colorVar(form.color) }}
        >
          <CategoryIcon name={form.icon} className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">
            {isEditing ? t('settings.editCat') : t('settings.newCat')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('settings.catDesc')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label>{t('settings.catType')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={isEditing}
                onClick={() => setForm((prev) => ({ ...prev, type }))}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  form.type === type ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                )}
              >
                {type === 'expense' ? t('settings.catTypeExpense') : t('settings.catTypeIncome')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">{t('settings.catName')}</Label>
          <Input
            id="category-name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('settings.catPlaceholder')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t('settings.icon')}</Label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, icon }))}
                aria-label={t('settings.iconLabel', { icon })}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-lg border transition-colors',
                  form.icon === icon ? 'border-primary bg-accent text-primary' : 'border-border hover:bg-muted',
                )}
              >
                <CategoryIcon name={icon} className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t('settings.color')}</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, color }))}
                aria-label={t('settings.colorLabel', { color })}
                className={cn(
                  'size-8 rounded-full border-2 transition-transform active:scale-95',
                  form.color === color ? 'border-foreground' : 'border-transparent',
                )}
                style={{ backgroundColor: colorVar(color) }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex gap-2 bg-card p-4 sm:px-5">
        <Button variant="outline" size="lg" className="h-11 flex-1" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 text-expense hover:bg-expense/10 hover:text-expense"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button size="lg" className="h-11 flex-[2]" disabled={!canSave} onClick={handleSave}>
          {isEditing ? t('settings.saveCat') : t('settings.createCat')}
        </Button>
      </div>
    </div>
  )
}
