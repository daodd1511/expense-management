
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { useLang } from '@/core/i18n'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

interface CategoryGroup {
  parent: Category
  childCategories: Category[]
}

function groupCategories(categories: Category[]): CategoryGroup[] {
  const parents = categories.filter((c) => c.parentId === null)
  const childrenByParentId = new Map<string, Category[]>()
  for (const c of categories) {
    if (c.parentId === null) continue
    const siblings = childrenByParentId.get(c.parentId) ?? []
    siblings.push(c)
    childrenByParentId.set(c.parentId, siblings)
  }
  return parents.map((parent) => ({
    parent,
    childCategories: childrenByParentId.get(parent.id) ?? [],
  }))
}

function findParentId(categories: Category[], selectedId: string | null): string | null {
  const selected = categories.find((c) => c.id === selectedId)
  if (!selected) return null
  return selected.parentId ?? selected.id
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useLang()
  const groups = useMemo(() => groupCategories(categories), [categories])
  const [expandedId, setExpandedId] = useState<string | null>(() => findParentId(categories, selectedId))

  const toggleExpanded = useCallback((parentId: string) => {
    setExpandedId((current) => (current === parentId ? null : parentId))
  }, [])

  return (
    <div className="flex flex-col gap-1">
      {groups.map(({ parent, childCategories }) => (
        <CategoryGroupRow
          key={parent.id}
          parent={parent}
          childCategories={childCategories}
          selectedId={selectedId}
          expanded={expandedId === parent.id}
          onSelect={onSelect}
          onToggleExpanded={toggleExpanded}
        />
      ))}
    </div>
  )
}

function CategoryGroupRow({
  parent,
  childCategories,
  selectedId,
  expanded,
  onSelect,
  onToggleExpanded,
}: {
  parent: Category
  childCategories: Category[]
  selectedId: string | null
  expanded: boolean
  onSelect: (id: string) => void
  onToggleExpanded: (parentId: string) => void
}) {
  const { t } = useLang()
  const hasChildren = childCategories.length > 0
  const parentActive = selectedId === parent.id

  const handleSelectParent = useCallback(() => onSelect(parent.id), [onSelect, parent.id])
  const handleToggle = useCallback(() => onToggleExpanded(parent.id), [onToggleExpanded, parent.id])

  return (
    <div role="group" aria-label={parent.name}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleSelectParent}
          aria-pressed={parentActive}
          className={cn(
            'flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors',
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
        {hasChildren && (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-label={expanded ? t('category.collapseGroup', { name: parent.name }) : t('category.expandGroup', { name: parent.name })}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 flex flex-col gap-0.5 border-l border-border pl-3">
          {childCategories.map((child) => {
            const active = selectedId === child.id
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  active ? 'text-primary-foreground' : 'text-foreground hover:bg-muted',
                )}
                style={active ? { backgroundColor: colorVar(child.color) } : undefined}
              >
                {child.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
