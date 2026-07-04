
import { useCallback, useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { CategoryPicker } from '@/features/categories/components/CategoryPicker'
import { Modal } from '@/shared/components/ui/overlay'
import { useLang } from '@/core/i18n'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function buildFavoritesList(
  categories: Category[],
  favoriteCategoryIds: Set<string>,
  selectedId: string | null,
): Category[] {
  const favorites = categories.filter((c) => favoriteCategoryIds.has(c.id))
  if (selectedId && !favoriteCategoryIds.has(selectedId)) {
    const selected = categories.find((c) => c.id === selectedId)
    if (selected) return [...favorites, selected]
  }
  return favorites
}

export function FavoriteCategoryPicker({
  categories,
  favoriteCategoryIds,
  selectedId,
  onSelect,
  allowClear = false,
  clearLabel = '—',
  disabled = false,
}: {
  categories: Category[]
  favoriteCategoryIds: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  allowClear?: boolean
  clearLabel?: string
  disabled?: boolean
}) {
  const { t } = useLang()
  const [showAllOpen, setShowAllOpen] = useState(false)
  const favorites = buildFavoritesList(categories, favoriteCategoryIds, selectedId)

  const handleShowAll = useCallback(() => setShowAllOpen(true), [])
  const handleCloseShowAll = useCallback(() => setShowAllOpen(false), [])
  const handleSelectFromModal = useCallback(
    (id: string) => {
      onSelect(id)
      setShowAllOpen(false)
    },
    [onSelect],
  )

  return (
    <div className="flex flex-col gap-3">
      {favorites.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {allowClear && (
            <button
              type="button"
              onClick={() => onSelect('')}
              aria-label={clearLabel}
              aria-pressed={selectedId === null}
              disabled={disabled}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center transition-colors',
                selectedId === null ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                {clearLabel}
              </span>
              <span className="w-full truncate text-xs">{clearLabel}</span>
            </button>
          )}
          {favorites.map((category) => (
            <FavoriteCategoryButton
              key={category.id}
              category={category}
              active={selectedId === category.id}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allowClear && (
            <button
              type="button"
              onClick={() => onSelect('')}
              aria-label={clearLabel}
              aria-pressed={selectedId === null}
              disabled={disabled}
              className={cn(
                'inline-flex w-fit items-center rounded-lg border border-dashed px-3 py-2 text-sm transition-colors',
                selectedId === null ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {clearLabel}
            </button>
          )}
          <p className="text-sm text-muted-foreground">{t('category.noFavorites')}</p>
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={handleShowAll}
          className="inline-flex w-fit items-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {t('category.showAll')}
        </button>
      )}

      <Modal open={showAllOpen} onClose={handleCloseShowAll} className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onSelect('')
                setShowAllOpen(false)
              }}
              aria-label={clearLabel}
              className={cn(
                'inline-flex w-fit items-center rounded-lg border border-dashed px-3 py-2 text-sm transition-colors',
                selectedId === null ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {clearLabel}
            </button>
          )}
          <CategoryPicker categories={categories} selectedId={selectedId} onSelect={handleSelectFromModal} />
        </div>
      </Modal>
    </div>
  )
}

function FavoriteCategoryButton({
  category,
  active,
  onSelect,
  disabled = false,
}: {
  category: Category
  active: boolean
  onSelect: (id: string) => void
  disabled?: boolean
}) {
  const handleSelect = useCallback(() => onSelect(category.id), [category.id, onSelect])

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors',
        active ? 'bg-accent ring-1 ring-primary/25' : 'hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className="inline-flex size-9 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: colorVar(category.color) }}
      >
        <CategoryIcon name={category.icon} className="size-4" />
      </span>
      <span className="w-full truncate text-xs text-muted-foreground">{category.name}</span>
    </button>
  )
}
