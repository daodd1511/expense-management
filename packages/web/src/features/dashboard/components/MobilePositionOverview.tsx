import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, HandCoins, Landmark, Wallet } from "lucide-react";
import { useLang } from "@/core/i18n";
import { AccountList } from "@/features/accounts/components/AccountList";
import { useAccounts } from "@/features/accounts/queries";
import { LoanSummaryRow } from "@/features/loans/components/LoanOverviewParts";
import { loanKpis } from "@/features/loans/components/loan-ui";
import { useLoanSummaries } from "@/features/loans/queries";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatVND } from "@/shared/lib/format";

export function MobilePositionOverview() {
  const { data: accounts = [] } = useAccounts();
  const { data: loans = [] } = useLoanSummaries();
  const navigate = useNavigate();
  const { t } = useLang();

  const accountBalance = accounts.reduce(
    (sum, account) => sum + (account.balance ?? account.openingBalance),
    0,
  );
  const loanPosition = loanKpis(loans);
  const totalPosition = accountBalance + loanPosition.netPosition;
  const openLoans = loans
    .filter(
      (loan) => loan.status === "open" || loan.status === "due-soon" || loan.status === "overdue",
    )
    .slice(0, 3);

  return (
    <MobilePageContainer>
      <Card className="relative overflow-hidden border-0 bg-primary text-primary-foreground">
        <div className="absolute -right-10 -top-10 size-36 rounded-full border border-primary-foreground/10" />
        <div className="absolute -right-4 top-12 size-20 rounded-full border border-primary-foreground/10" />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Landmark className="size-4" />
            {t("position.totalPosition")}
          </div>
          <p className="tabular mt-1 text-3xl font-bold tracking-tight">
            {formatVND(totalPosition)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroMetric label={t("position.accountsBalance")} value={formatVND(accountBalance)} />
            <HeroMetric
              label={t("loans.netPosition")}
              value={formatVND(loanPosition.netPosition)}
            />
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="position-accounts-title">
        <Card>
          <CardContent className="p-5">
            <OverviewHeading
              id="position-accounts-title"
              title={t("nav.accounts")}
              href="/accounts"
              actionLabel={t("dashboard.viewAll")}
            />
            <div className="mt-4">
              {accounts.length > 0 ? (
                <AccountList limit={3} />
              ) : (
                <EmptyState icon={Wallet} text={t("position.noAccounts")} />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="position-loans-title">
        <Card>
          <CardContent className="p-5">
            <OverviewHeading
              id="position-loans-title"
              title={t("nav.loans")}
              href="/loans"
              actionLabel={t("dashboard.viewAll")}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PositionMetric label={t("loans.owedToUser")} value={loanPosition.owedToUser} />
              <PositionMetric label={t("loans.userOwes")} value={loanPosition.userOwes} negative />
            </div>
            {openLoans.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                {openLoans.map((loan) => (
                  <LoanSummaryRow
                    key={loan.id}
                    loan={loan}
                    onOpen={() => navigate({ to: "/loans/$loanId", params: { loanId: loan.id } })}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState icon={HandCoins} text={t("position.noOpenLoans")} />
              </div>
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
  href: "/accounts" | "/loans";
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

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-foreground/10 p-3">
      <p className="text-xs opacity-70">{label}</p>
      <p className="tabular mt-1 truncate text-sm font-semibold" title={value}>
        {value}
      </p>
    </div>
  );
}

function PositionMetric({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`tabular mt-1 truncate text-base font-semibold ${negative ? "text-expense" : "text-income"}`}
      >
        {formatVND(value)}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Wallet; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      {text}
    </div>
  );
}
