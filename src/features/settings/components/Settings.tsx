import { Check, LogOut, Moon, Sun } from 'lucide-react'
import { Plus } from 'lucide-react'
import { useTheme } from '@/shared/components/ThemeProvider'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input, Label } from '@/shared/components/ui/input'
import { useAuth } from '@/features/auth/auth'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Category, Lang } from '@/core/types'
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

interface CategoryFormState {
  name: string
  icon: string
  color: string
}

const EMPTY_CATEGORY: CategoryFormState = {
  name: '',
  icon: 'Tag',
  color: 'chart-1',
}

export function DesktopSettings() {
  const { categories, addCategory, updateCategory } = useStore()
  const { theme, setTheme } = useTheme()
  const { t, lang, setLang } = useLang()
  const { user, signOut } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(categories[0]?.id ?? null)
  const editingCategory = categories.find((c) => c.id === editingId)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => toFormState(editingCategory))

  const handleSelectCategory = (category: Category) => {
    setEditingId(category.id)
    setCategoryForm(toFormState(category))
  }

  const handleNewCategory = () => {
    setEditingId(null)
    setCategoryForm(EMPTY_CATEGORY)
  }

  const handleSaveCategory = () => {
    const name = categoryForm.name.trim()
    if (!name) return

    const payload = {
      name,
      icon: categoryForm.icon,
      color: categoryForm.color,
    }

    if (editingId) updateCategory(editingId, payload)
    else addCategory(payload)
  }

  const canSaveCategory = categoryForm.name.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">{t('settings.appearance')}</h2>
            <p className="text-sm text-muted-foreground">{t('settings.appearanceDesc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map((th) => {
              const active = theme === th
              const Icon = th === 'light' ? Sun : Moon
              return (
                <button
                  key={th}
                  type="button"
                  onClick={() => setTheme(th)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors',
                    active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {th === 'light' ? t('settings.light') : t('settings.dark')}
                  </span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Language */}
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">{t('settings.language')}</h2>
            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['vi', 'en'] as Lang[]).map((l) => {
              const active = lang === l
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors',
                    active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <span>{l === 'vi' ? t('settings.langVi') : t('settings.langEn')}</span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Categories */}
        <Card className="flex flex-col gap-4 p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{t('settings.categories')}</h2>
              <p className="text-sm text-muted-foreground">{t('settings.categoriesActive', { n: categories.length })}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleNewCategory}>
              <Plus className="size-3.5" />
              {t('settings.add')}
            </Button>
          </div>

          <ul className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {categories.map((c) => (
              <li
                key={c.id}
                className="min-w-0"
              >
                <button
                  type="button"
                  onClick={() => handleSelectCategory(c)}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    editingId === c.id ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: colorVar(c.color) }}
                  >
                    <CategoryIcon name={c.icon} className="size-3.5" />
                  </span>
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-flex size-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: colorVar(categoryForm.color) }}
              >
                <CategoryIcon name={categoryForm.icon} className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">
                  {editingId ? t('settings.editCat') : t('settings.newCat')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('settings.catDesc')}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category-name">{t('settings.catName')}</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
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
                      onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                      aria-label={t('settings.iconLabel', { icon })}
                      className={cn(
                        'inline-flex size-9 items-center justify-center rounded-lg border transition-colors',
                        categoryForm.icon === icon ? 'border-primary bg-accent text-primary' : 'border-border hover:bg-muted',
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
                      onClick={() => setCategoryForm((prev) => ({ ...prev, color }))}
                      aria-label={t('settings.colorLabel', { color })}
                      className={cn(
                        'size-8 rounded-full border-2 transition-transform active:scale-95',
                        categoryForm.color === color ? 'border-foreground' : 'border-transparent',
                      )}
                      style={{ backgroundColor: colorVar(color) }}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={!canSaveCategory}
                onClick={handleSaveCategory}
                className="w-full"
              >
                {editingId ? t('settings.saveCat') : t('settings.createCat')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Account */}
        <Card className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Google</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" />
            {t('auth.signOut')}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function toFormState(category: Category | undefined): CategoryFormState {
  if (!category) return EMPTY_CATEGORY
  return {
    name: category.name,
    icon: category.icon,
    color: category.color,
  }
}
