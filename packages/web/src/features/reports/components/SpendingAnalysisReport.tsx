import { ArrowUpRight } from "lucide-react";
import { useAccountLookup } from "@/features/accounts/queries";
import { useCategoryLookup } from "@/features/categories/queries";
import { useTransactionOverlay } from "@/features/transactions/transaction-overlay";
import { useLang } from "@/core/i18n";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ReportsSkeleton } from "@/shared/components/Skeleton";
import { SpendingTrendChart, type SpendingTrendDatum } from "@/shared/components/Charts";
import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import { formatShortDate, formatVND } from "@/shared/lib/format";
import type { SpendingAnalysisPreset } from "@wallet/shared";
import { useSpendingAnalysis } from "../queries";
import type { ReportRange } from "../report-date";
import { SpendingCategoryBreakdown } from "./SpendingCategoryBreakdown";
import { SpendingChangeBadge } from "./SpendingChangeBadge";

export function SpendingAnalysisReport({
  range,
  preset,
}: {
  range: ReportRange;
  preset: SpendingAnalysisPreset;
}) {
  const { t } = useLang();
  const isDesktop = useIsDesktop();
  const categoryLookup = useCategoryLookup();
  const accountLookup = useAccountLookup();
  const { openEdit } = useTransactionOverlay();
  const { data, isPending } = useSpendingAnalysis({ ...range, preset });

  if (isPending || !data) {
    return <ReportsSkeleton mobile={!isDesktop} />;
  }

  const report = data.data;

  const handleTransactionClick = (transactionId: string, date: string) => {
    openEdit(transactionId, date.slice(0, 7));
  };

  const trendData: SpendingTrendDatum[] = report.trend.map((point) => ({
    label: formatShortDate(point.periodStart),
    current: point.current,
    previous: point.comparisonPeriodStart !== null ? point.previous : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("reports.spendingTotal")}</p>
            <p className="tabular-nums mt-1 text-2xl font-bold tracking-tight">
              {formatVND(report.totals.current)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <SpendingChangeBadge
                change={report.totals.change}
                changePercentage={report.totals.changePercentage}
              />
              <span className="text-xs text-muted-foreground">
                {t("reports.spendingVsPrevious")}
              </span>
            </div>
          </div>
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-expense-muted text-expense">
            <ArrowUpRight className="size-5" />
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="text-sm font-semibold">{t("reports.spendingTrendTitle")}</p>
          <SpendingTrendChart
            data={trendData}
            currentLabel={t("reports.spendingCurrentLabel")}
            previousLabel={t("reports.spendingPreviousLabel")}
          />
        </CardContent>
      </Card>

      <SpendingCategoryBreakdown
        categories={report.categories}
        getCategory={categoryLookup}
        getAccount={accountLookup}
        onTransactionClick={handleTransactionClick}
      />
    </div>
  );
}
