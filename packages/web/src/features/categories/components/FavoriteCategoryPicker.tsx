
import { LayoutGrid, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { CategoryPicker } from '@/features/categories/components/CategoryPicker'
import { CategoryTile } from '@/features/categories/components/CategoryTile'
import { BottomSheet, Modal } from '@/shared/components/ui/overlay'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useLang } from '@/core/i18n'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function buildFavoritesList(categories: Category[], favoriteCategoryIds: Set<string>): Category[] {
  return categories.filter((category) => favoriteCategoryIds.has(category.id))
}

function buildCategoryMeta(categories: Category[], category: Category) {
  const parent = category.parentId ? categories.find((candidate) => candidate.id === category.parentId) : null
  return {
    title: category.name,
    subtitle: parent?.name ?? null,
  }
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
  const isDesktop = useIsDesktop()
  const [showAllOpen, setShowAllOpen] = useState(false)
  const favorites = buildFavoritesList(categories, favoriteCategoryIds)
  const selectedNonFavorite =
    selectedId && !favoriteCategoryIds.has(selectedId)
      ? categories.find((category) => category.id === selectedId) ?? null
      : null

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
        <div className="flex flex-col gap-2">
          {allowClear && (
            <button
              type="button"
              onClick={() => onSelect('')}
              aria-label={clearLabel}
              aria-pressed={selectedId === null}
              disabled={disabled}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors',
                selectedId === null ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                {clearLabel}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{clearLabel}</span>
            </button>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {favorites.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                active={selectedId === category.id}
                onSelect={onSelect}
                disabled={disabled}
              />
            ))}
            {!disabled && <AllCategoriesTile label={t('category.showAll')} onClick={handleShowAll} />}
          </div>
          {selectedNonFavorite && (
            <SelectedCategoryRow
              categories={categories}
              category={selectedNonFavorite}
              onSelect={onSelect}
              disabled={disabled}
            />
          )}
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
          <EmptyFavoritesPanel
            headline={t('category.noFavorites')}
            hint={t('category.noFavoritesHint')}
            ctaLabel={t('category.browseAll')}
            onClick={handleShowAll}
            disabled={disabled}
          />
          {selectedNonFavorite && (
            <SelectedCategoryRow
              categories={categories}
              category={selectedNonFavorite}
              onSelect={onSelect}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {isDesktop ? (
        <Modal open={showAllOpen} onClose={handleCloseShowAll} className="p-4 sm:p-5">
          <ShowAllContent
            allowClear={allowClear}
            clearLabel={clearLabel}
            selectedId={selectedId}
            categories={categories}
            onClear={() => {
              onSelect('')
              setShowAllOpen(false)
            }}
            onSelect={handleSelectFromModal}
          />
        </Modal>
      ) : (
        <BottomSheet open={showAllOpen} onClose={handleCloseShowAll} title={t('category.allCategories')}>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ShowAllContent
              allowClear={allowClear}
              clearLabel={clearLabel}
              selectedId={selectedId}
              categories={categories}
              onClear={() => {
                onSelect('')
                setShowAllOpen(false)
              }}
              onSelect={handleSelectFromModal}
            />
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

function ShowAllContent({
  allowClear,
  clearLabel,
  selectedId,
  categories,
  onClear,
  onSelect,
}: {
  allowClear: boolean
  clearLabel: string
  selectedId: string | null
  categories: Category[]
  onClear: () => void
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {allowClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className={cn(
            'inline-flex w-fit items-center rounded-lg border border-dashed px-3 py-2 text-sm transition-colors',
            selectedId === null ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          {clearLabel}
        </button>
      )}
      <CategoryPicker categories={categories} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}

/**
 * Trailing cell in the favorites grid that opens the full category picker — sized and shaped
 * like a `CategoryTile` so it reads as a natural continuation of the grid (an "all categories"
 * tile) rather than a disconnected text link below it.
 */
function AllCategoriesTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-dashed border-border px-2 py-3 text-center text-primary transition-colors hover:border-primary/40 hover:bg-accent/60"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <LayoutGrid className="size-4" />
      </span>
      <span className="line-clamp-2 text-xs font-medium">{label}</span>
    </button>
  )
}

function EmptyFavoritesPanel({
  headline,
  hint,
  ctaLabel,
  onClick,
  disabled,
}: {
  headline: string
  hint: string
  ctaLabel: string
  onClick: () => void
  disabled: boolean
}) {
  const content = (
    <>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Sparkles className="size-5" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{headline}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      {!disabled && (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <LayoutGrid className="size-3.5" />
          {ctaLabel}
        </span>
      )}
    </>
  )

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border bg-accent/25 px-4 py-6 text-center opacity-60">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border bg-accent/40 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/70"
    >
      {content}
    </button>
  )
}

function SelectedCategoryRow({
  categories,
  category,
  onSelect,
  disabled = false,
}: {
  categories: Category[]
  category: Category
  onSelect: (id: string) => void
  disabled?: boolean
}) {
  const handleSelect = useCallback(() => onSelect(category.id), [category.id, onSelect])
  const { title, subtitle } = buildCategoryMeta(categories, category)

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-pressed
      disabled={disabled}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors bg-accent ring-1 ring-primary/25',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: colorVar(category.color) }}
      >
        <CategoryIcon name={category.icon} className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
      </span>
    </button>
  )
}
