import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { groupCategories } from '@/features/categories/group'
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { Category } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-md', className)}
      style={{ backgroundColor: `color-mix(in oklab, ${colorVar(category.color)} 18%, transparent)` }}
    >
      <CategoryIcon name={category.icon} className="size-3.5" style={{ color: colorVar(category.color) }} />
    </span>
  )
}

/**
 * A category-picking `Select` grouped by parent, with the same tinted icon-badge language
 * used everywhere else categories are shown (BudgetBars, TransactionRow, ...) — instead of
 * a flat, icon-less list of names.
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
  const groups = groupCategories(categories)
  const byId = new Map(categories.map((category) => [category.id, category]))

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue>
          {(selected: string | null) => {
            const category = selected ? byId.get(selected) : undefined
            if (!category) return <span className="text-muted-foreground">{emptyLabel}</span>
            return (
              <span className="flex min-w-0 items-center gap-2">
                <CategoryBadge category={category} className="size-5" />
                <span className="truncate">{category.name}</span>
              </span>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            <SelectItem value="">{emptyLabel}</SelectItem>
            {groups.map(({ parent, childCategories }, index) => (
              <SelectGroup key={parent.id} className={cn(index > 0 && 'mt-1 border-t border-border pt-1')}>
                <SelectItem value={parent.id} className="font-medium">
                  <CategoryBadge category={parent} />
                  {parent.name}
                </SelectItem>
                {childCategories.map((child) => (
                  <SelectItem key={child.id} value={child.id} className="pl-11">
                    <CategoryBadge category={child} className="size-5" />
                    {child.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}
