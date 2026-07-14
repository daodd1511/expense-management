import { ArrowDownLeft, ArrowUpRight, ChevronRight, HandCoins, TrendingUp } from "lucide-react";
import { DATE_LOCALE } from "@/core/i18n";
import { BalanceTrendChart, CategoryDonut } from "@/shared/components/Charts";
import { AccountList } from "@/features/accounts/components/AccountList";
import { useBalanceTrend, useDashboardSummary } from "@/features/dashboard/queries";
import { TransactionRow } from "@/features/transactions/components/TransactionRow";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DashboardSkeleton } from "@/shared/components/Skeleton";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { buildDonutData, monthSummary } from "@/shared/lib/derive";
import { formatCompactVND, formatVND, monthLabel } from "@/shared/lib/format";
import { useLang } from "@/core/i18n";
import { useTransactions } from "@/features/transactions/queries";
import { todayLocalMonthIso } from "@/shared/lib/date";
import { useCategoryLookup } from "@/features/categories/queries";
import { useAccounts } from "@/features/accounts/queries";
import { useSubscriptions } from "@/features/subscriptions/queries";
import { isDue, isDueSoon, totalMonthlyCost } from "@/features/subscriptions/helpers";
import type { Transaction } from "@/core/types";

function toTrendLabel(month: string, lang: "vi" | "en") {
  const monthIndex = Number(month.slice(5, 7)) - 1;
  if (lang === "vi") return `T${monthIndex + 1}`;
  return DATE_LOCALE.en.months[monthIndex].slice(0, 3);
}

export function MobileHome({
  onNavigate,
  onEdit,
  onOpenLoan,
}: {
  onNavigate: (section: string, search?: Record<string, string | undefined>) => void;
  onEdit: (tx: Transaction) => void;
  onOpenLoan?: (loanId: string) => void;
}) {
  const { data: transactions = [], isPending: transactionsPending } = useTransactions();
  const { data: dashboardSummary, isPending: dashboardSummaryPending } = useDashboardSummary();
  const { data: balanceTrend = [], isPending: balanceTrendPending } = useBalanceTrend();
  const { isPending: accountsPending } = useAccounts();
  const { data: subscriptions = [], isPending: subscriptionsPending } = useSubscriptions();
  const getCategory = useCategoryLookup();
  const { t, lang } = useLang();
  const summary = monthSummary(transactions);
  const { data, total } = buildDonutData(transactions, getCategory);
  const recent = transactions.slice(0, 4);
  const currentMonth = todayLocalMonthIso();
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active);
  const dueSoonSubscriptions = activeSubscriptions.filter(
    (subscription) => isDue(subscription) || isDueSoon(subscription),
  );
  const monthlySubscriptionCost = totalMonthlyCost(subscriptions);
  const trendData = balanceTrend.map((entry) => ({
    month: toTrendLabel(entry.month, lang),
    balance: entry.balance,
  }));

  const handleCategorySelect = (categoryId?: string) => {
    if (!categoryId) return;
    onNavigate("transactions", {
      month: currentMonth,
      categoryId,
    });
  };

  if (
    transactionsPending ||
    dashboardSummaryPending ||
    balanceTrendPending ||
    accountsPending ||
    subscriptionsPending ||
    !dashboardSummary
  ) {
    return <DashboardSkeleton mobile />;
  }

  return (
    <MobilePageContainer>
      {/* Month summary hero */}
      <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">
              {t("dashboard.monthBalance")} · {monthLabel(new Date(), lang)}
            </span>
            <TrendingUp className="size-4 opacity-80" />
          </div>
          <div
            className="tabular mt-1 whitespace-nowrap text-3xl font-bold tracking-tight"
            title={formatVND(summary.balance)}
          >
            {formatCompactVND(summary.balance, lang)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-1 text-xs opacity-80">
                <ArrowDownLeft className="size-3.5" /> {t("dashboard.income")}
              </div>
              <div
                className="tabular mt-0.5 whitespace-nowrap text-base font-semibold"
                title={formatVND(summary.income)}
              >
                {formatCompactVND(summary.income, lang)}
              </div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-1 text-xs opacity-80">
                <ArrowUpRight className="size-3.5" /> {t("dashboard.expense")}
              </div>
              <div
                className="tabular mt-0.5 whitespace-nowrap text-base font-semibold"
                title={formatVND(summary.expense)}
              >
                {formatCompactVND(summary.expense, lang)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donut */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle
            title={t("dashboard.byCategory")}
            action={t("nav.reports")}
            onAction={() => onNavigate("reports")}
          />
          <div className="mt-3 flex items-center gap-3">
            <div className="w-[9.375rem] shrink-0">
              <CategoryDonut
                data={data}
                total={total}
                size={142}
                centerLabel={t("reports.expenseDonutCenter")}
                onSelect={(datum) => handleCategorySelect(datum.id)}
              />
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-2">
              {data.slice(0, 5).map((d) => (
                <li key={d.name}>
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(d.id)}
                    className="flex w-full items-center justify-between gap-2 text-left text-xs transition-colors hover:text-foreground"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle
            title={t("nav.subscriptions")}
            action={t("dashboard.viewAll")}
            onAction={() => onNavigate("subscriptions")}
          />
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-muted/60 p-4">
              <div className="text-xs text-muted-foreground">{t("sub.monthlyCost")}</div>
              <div
                className="tabular mt-1 whitespace-nowrap text-2xl font-semibold tracking-tight"
                title={formatVND(monthlySubscriptionCost)}
              >
                {formatCompactVND(monthlySubscriptionCost, lang)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("sub.activeCount", { n: activeSubscriptions.length })}
              </div>
            </div>
            {dueSoonSubscriptions.length > 0 ? (
              <div className="rounded-xl border border-expense/20 bg-expense-muted/20 p-4">
                <div className="text-xs font-medium text-expense">{t("sub.dueSoon")}</div>
                <div className="mt-1 text-sm">{dueSoonSubscriptions[0]?.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.subscriptionsDueCount", { n: dueSoonSubscriptions.length })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
                {t("dashboard.subscriptionsClear")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trend */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle title={t("dashboard.trend6mShort")} />
          <div className="mt-2">
            <BalanceTrendChart
              data={trendData}
              height={170}
              balanceLabel={t("dashboard.monthBalance")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle
            title={t("dashboard.accounts")}
            action={t("dashboard.viewAll")}
            onAction={() => onNavigate("accounts")}
          />
          <div className="mt-3">
            <AccountList />
          </div>
        </CardContent>
      </Card>

      {/* Loans */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle
            title={t("dashboard.loans")}
            action={t("dashboard.viewAll")}
            onAction={() => onNavigate("loans")}
          />
          <div className="mt-4 rounded-xl bg-accent p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <HandCoins className="size-4" />
                {t("loans.netPosition")}
              </span>
              {dashboardSummary.loans.overdueCount > 0 && (
                <span className="text-xs font-semibold text-expense">
                  {t("loans.overdueCountValue", { n: dashboardSummary.loans.overdueCount })}
                </span>
              )}
            </div>
            <div
              title={formatVND(dashboardSummary.loans.netPosition)}
              className={
                dashboardSummary.loans.netPosition >= 0
                  ? "tabular mt-1 text-2xl font-bold text-income"
                  : "tabular mt-1 text-2xl font-bold text-expense"
              }
            >
              {formatCompactVND(dashboardSummary.loans.netPosition, lang)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">{t("loans.owedToUser")}</span>
                <strong
                  className="tabular mt-1 block whitespace-nowrap text-income"
                  title={formatVND(dashboardSummary.loans.owedToUser)}
                >
                  {formatCompactVND(dashboardSummary.loans.owedToUser, lang)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">{t("loans.userOwes")}</span>
                <strong
                  className="tabular mt-1 block whitespace-nowrap text-expense"
                  title={formatVND(dashboardSummary.loans.userOwes)}
                >
                  {formatCompactVND(dashboardSummary.loans.userOwes, lang)}
                </strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent */}
      <Card>
        <CardContent className="p-5">
          <SectionTitle
            title={t("dashboard.recentShort")}
            action={t("dashboard.viewAll")}
            onAction={() => onNavigate("transactions")}
          />
          <div className="mt-1 flex flex-col">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onClick={() => onEdit(tx)}
                onOpenLoan={onOpenLoan}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </MobilePageContainer>
  );
}

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary"
        >
          {action} <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
