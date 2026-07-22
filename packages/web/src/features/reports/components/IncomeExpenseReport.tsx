import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { useAccountLookup } from "@/features/accounts/queries";
import { useCategoryLookup } from "@/features/categories/queries";
import { useTransactionOverlay } from "@/features/transactions/transaction-overlay";
import { useLang } from "@/core/i18n";
import { CategoryDonut } from "@/shared/components/Charts";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ReportsSkeleton } from "@/shared/components/Skeleton";
import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import { amountColorClass, formatSigned, formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useIncomeExpenseReport } from "../queries";
import type { ReportRange } from "../report-date";
import { ExpenseCategoryBreakdown } from "./ExpenseCategoryBreakdown";

export function IncomeExpenseReport({ range }: { range: ReportRange }) {
  const { t } = useLang();
  const isDesktop = useIsDesktop();
  const categoryLookup = useCategoryLookup();
  const accountLookup = useAccountLookup();
  const { openEdit } = useTransactionOverlay();
  const [activeCategoryType, setActiveCategoryType] = useState<"expense" | "income">("expense");
  const { data, isPending } = useIncomeExpenseReport(range);

  if (isPending || !data) {
    return <ReportsSkeleton mobile={!isDesktop} />;
  }

  const report = data.data;
  const expenseCategories = report.categories.filter((category) => category.type === "expense");
  const incomeCategories = report.categories.filter((category) => category.type === "income");

  const toDonutData = (categories: typeof report.categories) =>
    categories.map((category) => {
      const categoryInfo = categoryLookup(category.categoryId);
      return {
        id: category.categoryId,
        name: categoryInfo?.name ?? category.categoryId,
        value: category.amount,
        percentage: category.percentage,
        color: categoryInfo ? `var(--${categoryInfo.color})` : "var(--muted-foreground)",
      };
    });
  const expenseDonutData = toDonutData(expenseCategories);
  const incomeDonutData = toDonutData(incomeCategories);
  const activeCategories = activeCategoryType === "expense" ? expenseCategories : incomeCategories;
  const activeDonutData = activeCategoryType === "expense" ? expenseDonutData : incomeDonutData;
  const activeTotal =
    activeCategoryType === "expense" ? report.totals.expense : report.totals.income;
  const activeTitleKey =
    activeCategoryType === "expense" ? "reports.expenseCategories" : "reports.incomeCategories";
  const activeDonutLabelKey =
    activeCategoryType === "expense" ? "reports.expenseDonutCenter" : "reports.incomeDonutCenter";
  const activeEmptyTitleKey =
    activeCategoryType === "expense" ? "reports.expenseEmptyTitle" : "reports.incomeEmptyTitle";
  const activeEmptyDescriptionKey =
    activeCategoryType === "expense" ? "reports.expenseEmptyDesc" : "reports.incomeEmptyDesc";

  // The overlay looks the transaction up within its own date's month (useTransactions(month)
  // in transaction-overlay.tsx), not the report's selected range — a multi-month range
  // (e.g. "last 3 months") would otherwise fetch the wrong month and silently fail to find it.
  const handleTransactionClick = (transactionId: string, date: string) => {
    openEdit(transactionId, date.slice(0, 7));
  };

  return (
    <div className="flex flex-col gap-6">
      {isDesktop && (
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={t("reports.totalIncome")}
              value={formatVND(report.totals.income)}
              icon={ArrowDownLeft}
              tone="income"
            />
            <SummaryCard
              label={t("reports.totalExpense")}
              value={formatVND(report.totals.expense)}
              icon={ArrowUpRight}
              tone="expense"
            />
            <SummaryCard
              label={t("reports.totalNet")}
              value={formatSigned(report.totals.net, report.totals.net >= 0 ? "income" : "expense")}
              icon={TrendingUp}
              tone={report.totals.net >= 0 ? "income" : "expense"}
            />
            <SummaryCard
              label={t("reports.transactionCount")}
              value={t("reports.transactionCountValue", { n: report.totals.transactionCount })}
              icon={TrendingUp}
            />
          </CardContent>
        </Card>
      )}

      <div
        role="tablist"
        aria-label={t("reports.categoryView")}
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:w-fit"
      >
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={activeCategoryType === type}
            onClick={() => setActiveCategoryType(type)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeCategoryType === type
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(type === "expense" ? "dashboard.expense" : "dashboard.income")}
          </button>
        ))}
      </div>

      {activeCategories.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <CategorySummaryCard
            data={activeDonutData}
            total={activeTotal}
            centerLabel={t(activeDonutLabelKey)}
            categoryLabel={t(activeTitleKey)}
          />
          <ExpenseCategoryBreakdown
            categories={activeCategories}
            getCategory={categoryLookup}
            getAccount={accountLookup}
            onTransactionClick={handleTransactionClick}
            titleKey={activeTitleKey}
            emptyTitleKey={activeEmptyTitleKey}
            emptyDescriptionKey={activeEmptyDescriptionKey}
          />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-40 flex-col items-start justify-center gap-2 p-6">
            <p className="text-sm font-medium">{t(activeEmptyTitleKey)}</p>
            <p className="max-w-xl text-sm text-muted-foreground">{t(activeEmptyDescriptionKey)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategorySummaryCard({
  data,
  total,
  centerLabel,
  categoryLabel,
}: {
  data: { id: string; name: string; value: number; percentage: number; color: string }[];
  total: number;
  centerLabel: string;
  categoryLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-5">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
          <span className="tabular text-lg font-bold tracking-tight" title={formatVND(total)}>
            {formatVND(total)}
          </span>
        </div>
        <div className="w-full">
          <CategoryDonut
            data={data}
            total={total}
            centerLabel={centerLabel}
            showCenterTotal={false}
          />
        </div>
        <div className="w-full space-y-2" aria-label={categoryLabel}>
          {data.slice(0, 5).map((datum) => (
            <div key={datum.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: datum.color }}
                />
                <span className="truncate">{datum.name}</span>
              </div>
              <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                <span className="text-muted-foreground">{formatVND(datum.value)}</span>
                <span className="text-xs text-muted-foreground/70">
                  {Math.round(datum.percentage * 100)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone?: "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "tabular-nums mt-1 text-lg font-semibold",
              tone && amountColorClass(tone),
            )}
          >
            {value}
          </p>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}
