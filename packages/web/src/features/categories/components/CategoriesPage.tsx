
import { ArrowLeft, Plus } from 'lucide-react'
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
  const { categories, addCategory, updateCategory, deleteCategory } = useStore()
  const { t } = useLang()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const editingCategory = categories.find((c) => c.id === editingId)

  const handleSelectCategory = (category: Category) => {
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
      updateCategory(editingId, { name: form.name, icon: form.icon, color: form.color })
    } else {
      addCategory({ name: form.name, icon: form.icon, color: form.color, type: form.type })
    }
    closeForm()
  }

  const handleDeleteCategory = () => {
    if (!editingId) return
    deleteCategory(editingId)
    closeForm()
  }

  const categoryForm = (
    <CategoryForm
      initial={editingCategory}
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
            onSelect={handleSelectCategory}
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
  onSelect,
}: {
  parent: Category
  childCategories: Category[]
  editingId: string | null
  onSelect: (category: Category) => void
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <button
        type="button"
        onClick={() => onSelect(parent)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
          editingId === parent.id ? 'bg-accent' : 'hover:bg-muted',
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

      {childCategories.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {childCategories.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelect(child)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors',
                editingId === child.id ? 'bg-accent' : 'hover:bg-muted',
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
          ))}
        </div>
      )}
    </div>
  )
}
