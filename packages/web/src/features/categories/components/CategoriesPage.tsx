
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { BottomSheet, Drawer } from '@/shared/components/ui/overlay'
import { CategoriesSkeleton } from '@/shared/components/Skeleton'
import { groupCategories } from '@/features/categories/group'
import { CategoryForm, type CategoryFormState } from '@/features/categories/components/CategoryForm'
import { useLang } from '@/core/i18n'
import {
  useAddCategory,
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/queries'
import {
  useAddFavorite,
  useFavoriteCategoryIds,
  useRemoveFavorite,
} from '@/features/categories/favorites-queries'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function CategoriesPage({
  variant,
  onBack,
}: {
  variant: 'mobile' | 'desktop'
  onBack: () => void
}) {
  const isMobile = variant === 'mobile'
  const { data: categories = [], isPending } = useCategories()
  const addCat = useAddCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()
  const favoriteCategoryIds = useFavoriteCategoryIds()
  const addFav = useAddFavorite()
  const removeFav = useRemoveFavorite()
  const { t } = useLang()
  const [activeType, setActiveType] = useState<Category['type']>('expense')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const editingCategory = categories.find((c) => c.id === editingId)
  const visibleGroups = groupCategories(categories.filter((category) => category.type === activeType))

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

  const handleSaveCategory = async (form: CategoryFormState) => {
    if (editingId) {
      await updateCat.mutateAsync({
        id: editingId,
        patch: { name: form.name, icon: form.icon, color: form.color, parentId: form.parentId },
      })
    } else {
      await addCat.mutateAsync({ name: form.name, icon: form.icon, color: form.color, type: form.type, parentId: form.parentId })
    }
    closeForm()
  }

  const handleDeleteCategory = async () => {
    if (!editingId) return
    await deleteCat.mutateAsync(editingId)
    closeForm()
  }

  const handleToggleFavorite = (categoryId: string) => {
    if (favoriteCategoryIds.has(categoryId)) removeFav.mutateAsync(categoryId)
    else addFav.mutateAsync(categoryId)
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

  if (isPending) {
    return <CategoriesSkeleton mobile={isMobile} />
  }

  return (
    <div className={cn('flex flex-col', isMobile ? 'gap-4 p-4 pt-3' : 'gap-6')}>
      <div className={cn('flex flex-col', isMobile ? 'gap-2' : 'gap-3')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t('settings.title')}
            </button>
            {!isMobile && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">{t('settings.categories')}</h1>
                <p className="text-sm text-muted-foreground">{t('settings.categoriesActive', { n: categories.length })}</p>
              </>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleNewCategory}>
            <Plus className="size-3.5" />
            {t('settings.add')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {([
            { value: 'expense', label: t('dashboard.expense') },
            { value: 'income', label: t('dashboard.income') },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveType(option.value)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeType === option.value
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {visibleGroups.map(({ parent, childCategories }) => (
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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={parent.isSystem}
          onClick={() => onSelect(parent)}
          className={cn(
            'flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70',
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
        <div className="flex flex-col gap-1">
          {childCategories.map((child) => (
            <div key={child.id} className="relative">
              <button
                type="button"
                disabled={child.isSystem}
                onClick={() => onSelect(child)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 pr-12 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                  editingId === child.id ? 'bg-accent' : !child.isSystem && 'hover:bg-muted',
                )}
              >
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: colorVar(child.color) }}
                >
                  <CategoryIcon name={child.icon} className="size-4" />
                </span>
                <span className="truncate text-sm text-foreground">{child.name}</span>
              </button>
              <FavoriteToggle
                isFavorite={favoriteCategoryIds.has(child.id)}
                label={child.name}
                onToggle={() => onToggleFavorite(child.id)}
                className="absolute top-1/2 right-3 -translate-y-1/2"
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
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Star className={cn('size-3.5', isFavorite && 'fill-primary text-primary')} />
    </button>
  )
}
