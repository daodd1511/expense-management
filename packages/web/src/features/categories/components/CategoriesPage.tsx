
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { BottomSheet, Drawer } from '@/shared/components/ui/overlay'
import { groupCategories } from '@/features/categories/group'
import { CategoryForm, type CategoryFormState } from '@/features/categories/components/CategoryForm'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function CategoriesPage({
  variant,
  onBack,
}: {
  variant: 'mobile' | 'desktop'
  onBack: () => void
}) {
  const { categories, addCategory, updateCategory, deleteCategory, favoriteCategoryIds, addFavorite, removeFavorite } =
    useStore()
  const { t } = useLang()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const editingCategory = categories.find((c) => c.id === editingId)

  const handleSelectCategory = (category: Category) => {
    if (category.isSystem) return
    setEditingId(category.id)
    setFormOpen(true)
  }

  const handleNewCategory = () => {
    setEditingId(null)
    setFormOpen(true)
  }

  const closeForm = () => setFormOpen(false)

  const handleSaveCategory = (form: CategoryFormState) => {
    if (editingId) {
      updateCategory(editingId, { name: form.name, icon: form.icon, color: form.color, parentId: form.parentId })
    } else {
      addCategory({ name: form.name, icon: form.icon, color: form.color, type: form.type, parentId: form.parentId })
    }
    closeForm()
  }

  const handleDeleteCategory = () => {
    if (!editingId) return
    deleteCategory(editingId)
    closeForm()
  }

  const handleToggleFavorite = (categoryId: string) => {
    if (favoriteCategoryIds.has(categoryId)) removeFavorite(categoryId)
    else addFavorite(categoryId)
  }

  const categoryForm = (
    <CategoryForm
      initial={editingCategory}
      categories={categories}
      onSave={handleSaveCategory}
      onDelete={handleDeleteCategory}
      onCancel={closeForm}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('settings.title')}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('settings.categories')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.categoriesActive', { n: categories.length })}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleNewCategory}>
            <Plus className="size-3.5" />
            {t('settings.add')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {groupCategories(categories).map(({ parent, childCategories }) => (
          <CategoryGroupBox
            key={parent.id}
            parent={parent}
            childCategories={childCategories}
            editingId={editingId}
            favoriteCategoryIds={favoriteCategoryIds}
            onSelect={handleSelectCategory}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>

      {variant === 'mobile' ? (
        <BottomSheet open={formOpen} onClose={closeForm} title={editingId ? t('settings.editCat') : t('settings.newCat')}>
          {categoryForm}
        </BottomSheet>
      ) : (
        <Drawer open={formOpen} onClose={closeForm}>
          {categoryForm}
        </Drawer>
      )}
    </div>
  )
}

function CategoryGroupBox({
  parent,
  childCategories,
  editingId,
  favoriteCategoryIds,
  onSelect,
  onToggleFavorite,
}: {
  parent: Category
  childCategories: Category[]
  editingId: string | null
  favoriteCategoryIds: Set<string>
  onSelect: (category: Category) => void
  onToggleFavorite: (categoryId: string) => void
}) {
  const { t } = useLang()
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={parent.isSystem}
          onClick={() => onSelect(parent)}
          className={cn(
            'flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70',
            editingId === parent.id ? 'bg-accent' : !parent.isSystem && 'hover:bg-muted',
          )}
        >
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: colorVar(parent.color) }}
          >
            <CategoryIcon name={parent.icon} className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold">{parent.name}</span>
        </button>
        <FavoriteToggle
          isFavorite={favoriteCategoryIds.has(parent.id)}
          label={parent.name}
          onToggle={() => onToggleFavorite(parent.id)}
        />
      </div>

      {childCategories.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {childCategories.map((child) => (
            <div key={child.id} className="relative">
              <button
                type="button"
                disabled={child.isSystem}
                onClick={() => onSelect(child)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                  editingId === child.id ? 'bg-accent' : !child.isSystem && 'hover:bg-muted',
                )}
              >
                <span
                  className="inline-flex size-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: colorVar(child.color) }}
                >
                  <CategoryIcon name={child.icon} className="size-4" />
                </span>
                <span className="w-full truncate text-xs text-muted-foreground">{child.name}</span>
              </button>
              <FavoriteToggle
                isFavorite={favoriteCategoryIds.has(child.id)}
                label={child.name}
                onToggle={() => onToggleFavorite(child.id)}
                className="absolute -right-1 -top-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FavoriteToggle({
  isFavorite,
  label,
  onToggle,
  className,
}: {
  isFavorite: boolean
  label: string
  onToggle: () => void
  className?: string
}) {
  const { t } = useLang()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t('category.unfavorite', { name: label }) : t('category.favorite', { name: label })}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground',
        className,
      )}
    >
      <Star className={cn('size-3.5', isFavorite && 'fill-primary text-primary')} />
    </button>
  )
}
