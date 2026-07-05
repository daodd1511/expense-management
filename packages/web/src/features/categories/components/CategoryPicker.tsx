import { useMemo } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { CategoryChip } from '@/features/categories/components/CategoryChip'
import { groupCategories } from '@/features/categories/group'
import type { Category } from '@/core/types'

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
        <div key={parent.id} role="group" aria-label={parent.name} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CategoryIcon name={parent.icon} className="size-3.5" style={{ color: colorVar(parent.color) }} />
            {parent.name}
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryChip category={parent} active={selectedId === parent.id} onSelect={onSelect} />
            {childCategories.map((child) => (
              <CategoryChip key={child.id} category={child} active={selectedId === child.id} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
