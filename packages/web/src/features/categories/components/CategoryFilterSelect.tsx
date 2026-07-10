import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { groupCategories } from '@/features/categories/group'
import {
  Select,
  SelectGroup,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

/**
 * Renders as the "Chip / Filter Pill" documented in docs/design/DESIGN.md, not a vertical list of
 * option rows — selection is shown by the category's own color filling the pill, so this
 * bypasses the shared SelectItem wrapper (which always renders a checkmark indicator) in
 * favor of the raw primitive with fully custom, indicator-less styling. `active` is computed
 * by the caller (it already has the current `value`) rather than read off a CSS data
 * attribute, since the fill color is per-category and can't be expressed as a static class.
 */
function CategoryChipItem({ category, active }: { category: Category; active: boolean }) {
  return (
    <SelectPrimitive.Item
      value={category.id}
      className={cn(
        'inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors',
        active
          ? 'border-transparent text-white'
          : 'border-border bg-background text-foreground data-[highlighted]:bg-muted',
      )}
      style={active ? { backgroundColor: colorVar(category.color) } : undefined}
    >
      <CategoryIcon
        name={category.icon}
        className="size-3.5 shrink-0"
        style={active ? undefined : { color: colorVar(category.color) }}
      />
      <SelectPrimitive.ItemText>{category.name}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

/**
 * A category-picking `Select` grouped by parent, rendering the documented Chip/Filter Pill
 * (docs/design/DESIGN.md) inside the popup instead of a flat, icon-less list of option rows.
 */
export function CategoryFilterSelect({
  categories,
  value,
  onChange,
  ariaLabel,
  emptyLabel,
}: {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  ariaLabel: string
  emptyLabel: string
}) {
  const visibleCategories = categories.filter((category) => !category.isHidden)
  const groups = groupCategories(visibleCategories)
  const byId = new Map(visibleCategories.map((category) => [category.id, category]))

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue>
          {(selected: string | null) => {
            const category = selected ? byId.get(selected) : undefined
            if (!category) return <span className="text-muted-foreground">{emptyLabel}</span>
            return (
              <span className="flex min-w-0 items-center gap-2">
                <CategoryIcon name={category.icon} className="size-3.5 shrink-0" style={{ color: colorVar(category.color) }} />
                <span className="truncate">{category.name}</span>
              </span>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup className="w-80 max-w-[90vw] p-3">
            <SelectPrimitive.Item
              value=""
              className={cn(
                'mb-3 inline-flex shrink-0 cursor-default items-center rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors',
                value === ''
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-background text-foreground data-[highlighted]:bg-muted',
              )}
            >
              <SelectPrimitive.ItemText>{emptyLabel}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
            <div className="flex flex-col gap-3">
              {groups.map(({ parent, childCategories }) => (
                <SelectGroup key={parent.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CategoryIcon name={parent.icon} className="size-3.5" style={{ color: colorVar(parent.color) }} />
                    {parent.name}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <CategoryChipItem category={parent} active={value === parent.id} />
                    {childCategories.map((child) => (
                      <CategoryChipItem key={child.id} category={child} active={value === child.id} />
                    ))}
                  </div>
                </SelectGroup>
              ))}
            </div>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}
