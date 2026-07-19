import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Scale,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useLang } from "@/core/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ReportsSkeleton } from "@/shared/components/Skeleton";
import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import { formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useFinancialPosition } from "../queries";
import type { ReportRange } from "../report-date";

export function FinancialPositionReport({ range }: { range: ReportRange }) {
  const { t } = useLang();
  const isDesktop = useIsDesktop();
  const { data, isPending } = useFinancialPosition(range);

  if (isPending || !data) return <ReportsSkeleton mobile={!isDesktop} />;
  const report = data.data;
  const reconciles =
    report.reconciliation.accountTotal.matches && report.reconciliation.netWorth.matches;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <PositionCard title={t("reports.positionOpening")} state={report.opening} />
        <PositionCard title={t("reports.positionClosing")} state={report.closing} accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.operatingFlow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FlowRow
              label={t("reports.totalIncome")}
              value={report.income}
              tone="income"
              icon={ArrowDownLeft}
            />
            <FlowRow
              label={t("reports.totalExpense")}
              value={-report.expense}
              tone="expense"
              icon={ArrowUpRight}
            />
            <FlowRow label={t("reports.surplus")} value={report.surplus} strong />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("reports.loanCashFlow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FlowRow label={t("reports.moneyLent")} value={-report.loanCashFlow.lent} />
            <FlowRow label={t("reports.moneyBorrowed")} value={report.loanCashFlow.borrowed} />
            <FlowRow
              label={t("reports.repaymentsReceived")}
              value={report.loanCashFlow.lendingRepaymentsReceived}
            />
            <FlowRow
              label={t("reports.repaymentsPaid")}
              value={-report.loanCashFlow.borrowingRepaymentsPaid}
            />
            <FlowRow label={t("reports.netLoanCashFlow")} value={report.loanCashFlow.net} strong />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("reports.nonCashChanges")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FlowRow label={t("reports.balanceAdjustments")} value={report.balanceAdjustments} />
            <FlowRow label={t("reports.writeOffLosses")} value={-report.writeOffs} tone="expense" />
            <FlowRow
              label={t("reports.forgivenessGains")}
              value={report.forgiveness}
              tone="income"
            />
            <FlowRow
              label={t("reports.openingLending")}
              value={report.openingLoanAdjustments.lending}
            />
            <FlowRow
              label={t("reports.openingBorrowing")}
              value={-report.openingLoanAdjustments.borrowing}
            />
          </CardContent>
        </Card>
      </div>

      <Card
        className={cn(
          reconciles
            ? "border-income/30 bg-income-muted/10"
            : "border-expense/30 bg-expense-muted/10",
        )}
      >
        <CardContent className="flex items-start gap-3 p-4">
          {reconciles ? (
            <CheckCircle2 className="mt-0.5 size-5 text-income" />
          ) : (
            <TriangleAlert className="mt-0.5 size-5 text-expense" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {reconciles ? t("reports.reconciled") : t("reports.notReconciled")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("reports.reconciliationDetail", {
                account: formatVND(report.reconciliation.accountTotal.actual),
                netWorth: formatVND(report.reconciliation.netWorth.actual),
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PositionCard({
  title,
  state,
  accent = false,
}: {
  title: string;
  state: {
    accountTotal: number;
    lendingOutstanding: number;
    borrowingOutstanding: number;
    netWorth: number;
  };
  accent?: boolean;
}) {
  const { t } = useLang();
  const items = [
    { label: t("reports.accountTotal"), value: state.accountTotal, icon: Wallet },
    { label: t("loans.owedToUser"), value: state.lendingOutstanding, icon: ArrowDownLeft },
    { label: t("loans.userOwes"), value: -state.borrowingOutstanding, icon: ArrowUpRight },
    { label: t("dashboard.netWorth"), value: state.netWorth, icon: Scale },
  ];
  return (
    <Card className={cn(accent && "border-primary/30")}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border p-3">
            <item.icon className="size-4 text-muted-foreground" />
            <span className="mt-2 block text-xs text-muted-foreground">{item.label}</span>
            <strong
              className={cn(
                "tabular mt-1 block text-base",
                item.value < 0 ? "text-expense" : "text-foreground",
              )}
            >
              {item.value < 0 ? "−" : ""}
              {formatVND(item.value)}
            </strong>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FlowRow({
  label,
  value,
  tone,
  icon: Icon,
  strong = false,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense";
  icon?: typeof ArrowDownLeft;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        strong && "border-t border-border pt-3 font-semibold",
      )}
    >
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          "tabular",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
        )}
      >
        {value < 0 ? "−" : value > 0 ? "+" : ""}
        {formatVND(value)}
      </span>
    </div>
  );
}
