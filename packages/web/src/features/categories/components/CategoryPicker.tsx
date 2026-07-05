import { useMemo } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { CategoryTile } from '@/features/categories/components/CategoryTile'
import { groupCategories } from '@/features/categories/group'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const groups = useMemo(() => groupCategories(categories), [categories])

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ parent, childCategories }) => (
        <CategoryGroupSection
          key={parent.id}
          parent={parent}
          childCategories={childCategories}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function CategoryGroupSection({
  parent,
  childCategories,
  selectedId,
  onSelect,
}: {
  parent: Category
  childCategories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const parentActive = selectedId === parent.id

  return (
    <div role="group" aria-label={parent.name} className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onSelect(parent.id)}
        aria-pressed={parentActive}
        className={cn(
          'flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition-colors',
          parentActive ? 'text-primary-foreground' : 'text-foreground hover:bg-muted',
        )}
        style={parentActive ? { backgroundColor: colorVar(parent.color) } : undefined}
      >
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: colorVar(parent.color) }}
        >
          <CategoryIcon name={parent.icon} className="size-3.5 text-white" />
        </span>
        {parent.name}
      </button>

      {childCategories.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {childCategories.map((child) => (
            <CategoryTile
              key={child.id}
              category={child}
              active={selectedId === child.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
