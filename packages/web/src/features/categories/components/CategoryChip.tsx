import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

/**
 * The "Chip / Filter Pill" documented in docs/design/DESIGN.md for category selection: fully
 * rounded, 6px/12px padding, 14px icon with a 6px gap. Selected state fills with the
 * category's own color and white text/icon; unselected is a bordered pill that fills to
 * Warm Fill (`--muted`) on hover.
 */
export function CategoryChip({
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
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-transparent text-white'
          : 'border-border bg-background text-foreground hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      style={active ? { backgroundColor: colorVar(category.color) } : undefined}
    >
      <CategoryIcon
        name={category.icon}
        className="size-3.5 shrink-0"
        style={active ? undefined : { color: colorVar(category.color) }}
      />
      {category.name}
    </button>
  )
}
