import { TrendingDown, TrendingUp } from "lucide-react";
import { useLang } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";

/**
 * Renders a Spending change per PLAN.md -> "Decisions": `changePercentage` null at a zero
 * baseline means "New" (spending appeared where there was none), 0 with both values zero
 * means "Unchanged" — neither is a normal percentage and must not be formatted as one.
 * An increase in spending is colored like an expense (bad); a decrease like income (good).
 */
export function SpendingChangeBadge({
  change,
  changePercentage,
  className,
}: {
  change: number;
  changePercentage: number | null;
  className?: string;
}) {
  const { t } = useLang();

  if (changePercentage === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-expense-muted px-2 py-0.5 text-xs font-medium text-expense",
          className,
        )}
      >
        {t("reports.spendingNew")}
      </span>
    );
  }

  if (changePercentage === 0 && change === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        {t("reports.spendingUnchanged")}
      </span>
    );
  }

  const increased = change > 0;
  const Icon = increased ? TrendingUp : TrendingDown;
  const colorClass = increased ? "text-expense" : "text-income";
  const percentLabel = `${Math.round(Math.abs(changePercentage) * 100)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        colorClass,
        className,
      )}
    >
      <Icon className="size-3" />
      {percentLabel}
    </span>
  );
}
