import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import type { Category } from "@/core/types";
import { cn } from "@/shared/lib/utils";

export function CategoryTile({
  category,
  active,
  onSelect,
  disabled = false,
}: {
  category: Category;
  active: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors",
        active ? "border-primary bg-accent ring-1 ring-primary/25" : "border-border hover:bg-muted",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: colorVar(category.color) }}
      >
        <CategoryIcon name={category.icon} className="size-4" />
      </span>
      <span className="line-clamp-2 text-xs font-medium text-foreground">{category.name}</span>
    </button>
  );
}
