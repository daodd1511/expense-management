import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

/**
 * Renders a transaction's category name, with its parent (when nested) stacked
 * above it as its own line. Stacking — rather than joining parent and child on
 * one line — gives each name the full row width to truncate against, instead of
 * splitting a single line and clipping both names sooner.
 */
export function CategoryBreadcrumb({
  category,
  parentCategory,
  trailing,
  className,
}: {
  category: Category | undefined
  parentCategory: Category | undefined
  /** Rendered inline after the category name, e.g. a receipt indicator. */
  trailing?: React.ReactNode
  className?: string
}) {
  if (!category) return null

  return (
    <span className={cn('flex min-w-0 flex-col', className)}>
      {parentCategory && (
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <CategoryIcon name={parentCategory.icon} className="size-3 shrink-0" style={{ color: colorVar(parentCategory.color) }} />
          <span className="truncate">{parentCategory.name}</span>
        </span>
      )}
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-foreground">{category.name}</span>
        {trailing}
      </span>
    </span>
  )
}
