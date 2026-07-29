import { Link } from "@tanstack/react-router";
import { CalendarClock, ChevronRight, Target } from "lucide-react";
import { useLang } from "@/core/i18n";
import { BudgetBars } from "@/features/budgets/components/BudgetBars";
import { useBudgets, useBudgetSpend } from "@/features/budgets/queries";
import { useSubscriptions } from "@/features/subscriptions/queries";
import { isDue, isDueSoon, totalMonthlyCost } from "@/features/subscriptions/helpers";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { formatShortDate, formatVND } from "@/shared/lib/format";

export function MobilePlanningOverview() {
  const { data: budgets = [] } = useBudgets();
  const spentFor = useBudgetSpend();
  const { data: subscriptions = [] } = useSubscriptions();
  const { t } = useLang();

  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + spentFor(budget), 0);
  const usedPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active);
  const dueSoon = activeSubscriptions
    .filter((subscription) => isDue(subscription) || isDueSoon(subscription))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <MobilePageContainer>
      <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm opacity-80">{t("planning.monthlyPlan")}</p>
              <p className="tabular mt-1 text-3xl font-bold tracking-tight">
                {formatVND(totalLimit)}
              </p>
            </div>
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/10">
              <Target className="size-5" />
            </span>
          </div>
          <div className="mt-5 rounded-2xl bg-primary-foreground/10 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-80">{t("planning.budgetUsed")}</span>
              <span className="font-semibold">{usedPercent}%</span>
            </div>
            <Progress
              value={Math.min(usedPercent, 100)}
              className="mt-2 bg-primary-foreground/20"
              indicatorClassName="bg-primary-foreground"
            />
            <p className="tabular mt-2 text-xs opacity-80">
              {t("planning.spentOf", {
                spent: formatVND(totalSpent),
                limit: formatVND(totalLimit),
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="planning-budgets-title">
        <Card>
          <CardContent className="p-5">
            <OverviewHeading
              id="planning-budgets-title"
              title={t("nav.budgets")}
              href="/budgets"
              actionLabel={t("dashboard.viewAll")}
            />
            <div className="mt-4">
              {budgets.length > 0 ? (
                <BudgetBars limit={3} />
              ) : (
                <EmptyState icon={Target} text={t("planning.noBudgets")} />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="planning-subscriptions-title">
        <Card>
          <CardContent className="p-5">
            <OverviewHeading
              id="planning-subscriptions-title"
              title={t("nav.subscriptions")}
              href="/subscriptions"
              actionLabel={t("dashboard.viewAll")}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                label={t("sub.monthlyCost")}
                value={formatVND(totalMonthlyCost(subscriptions))}
              />
              <Metric label={t("sub.dueSoon")} value={String(dueSoon.length)} />
            </div>
            {dueSoon.length > 0 ? (
              <ul className="mt-4 divide-y divide-border">
                {dueSoon.slice(0, 3).map((subscription) => (
                  <li
                    key={subscription.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-expense-muted text-expense">
                      <CalendarClock className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {subscription.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(subscription.nextDueDate)}
                      </span>
                    </span>
                    <span className="tabular text-sm font-semibold">
                      {formatVND(subscription.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {t("planning.noUpcomingSubscriptions")}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </MobilePageContainer>
  );
}

function OverviewHeading({
  id,
  title,
  href,
  actionLabel,
}: {
  id: string;
  title: string;
  href: "/budgets" | "/subscriptions";
  actionLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        {title}
      </h2>
      <Link to={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        {actionLabel}
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 truncate text-base font-semibold" title={value}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Target; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      {text}
    </div>
  );
}
