import { AlertCircle, Plus, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/core/i18n";
import { useLoanSummaries, usePersonSummaries } from "@/features/loans/queries";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatVND } from "@/shared/lib/format";
import {
  filterLoans,
  loanKpis,
  loansByPerson,
  type LoanDirectionFilter,
  type LoanStatusFilter,
} from "./loan-ui";
import { LoanFilters, LoanKpiGrid, LoanSummaryRow } from "./LoanOverviewParts";
import { LoanOverlays } from "./LoanOverlays";

export function MobileLoans({
  loanId,
  createIntentToken,
  onCreateIntentHandled,
  onLoanIdChange,
}: {
  loanId?: string;
  createIntentToken?: string;
  onCreateIntentHandled?: () => void;
  onLoanIdChange?: (loanId: string | null) => void;
}) {
  const { t } = useLang();
  const loansQuery = useLoanSummaries();
  const peopleQuery = usePersonSummaries();
  const loans = loansQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const [direction, setDirection] = useState<LoanDirectionFilter>("all");
  const [status, setStatus] = useState<LoanStatusFilter>("open-group");
  const [detailLoanId, setDetailLoanIdState] = useState<string | null>(
    loanId ?? null,
  );
  const [createOpen, setCreateOpen] = useState(Boolean(createIntentToken));
  const [handledCreateIntent, setHandledCreateIntent] = useState<string | null>(
    null,
  );
  const filteredLoans = filterLoans(loans, direction, status);
  const grouped = loansByPerson(filteredLoans);
  const visiblePeople = people.filter((person) => grouped.has(person.id));
  const kpis = loanKpis(loans);

  const setDetailLoanId = (nextLoanId: string | null) => {
    setDetailLoanIdState(nextLoanId);
    onLoanIdChange?.(nextLoanId);
  };

  useEffect(() => setDetailLoanIdState(loanId ?? null), [loanId]);
  useEffect(() => {
    if (!createIntentToken || handledCreateIntent === createIntentToken) return;
    setCreateOpen(true);
    setHandledCreateIntent(createIntentToken);
    onCreateIntentHandled?.();
  }, [createIntentToken, handledCreateIntent, onCreateIntentHandled]);

  if (loansQuery.isPending || peopleQuery.isPending) {
    return (
      <MobilePageContainer aria-label={t("loans.loading")}>
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </MobilePageContainer>
    );
  }
  if (loansQuery.isError || peopleQuery.isError) {
    return (
      <MobilePageContainer>
        <div
          role="alert"
          className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"
        >
          <AlertCircle className="size-8 text-expense" />
          <p className="font-medium">{t("loans.error")}</p>
          <Button
            variant="outline"
            onClick={() => {
              void loansQuery.refetch();
              void peopleQuery.refetch();
            }}
          >
            {t("loans.retry")}
          </Button>
        </div>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <header className="flex items-start justify-between gap-3">
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {t("loans.title")}
        </h1>
        <Button
          size="icon"
          aria-label={t("loans.newLoan")}
          className="rounded-xl"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </header>
      <LoanKpiGrid {...kpis} mobile />
      <LoanFilters
        direction={direction}
        status={status}
        onDirectionChange={setDirection}
        onStatusChange={setStatus}
      />

      {loans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <WalletCards className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("loans.emptyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("loans.emptyMessage")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-sm font-semibold text-primary"
          >
            {t("loans.addFirst")}
          </button>
        </div>
      ) : visiblePeople.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {t("loans.noMatches")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePeople.map((person) => {
            const personLoans = grouped.get(person.id) ?? [];
            return (
              <Card key={person.id} className="overflow-hidden">
                <CardContent className="border-b border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <UsersRound className="size-4 text-primary" />
                      <span className="font-semibold">{person.name}</span>
                    </span>
                    {person.overdueCount > 0 && (
                      <span className="rounded-full bg-expense px-2 py-0.5 text-xs font-bold text-expense-foreground">
                        {t("loans.overdueCountValue", {
                          n: person.overdueCount,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="tabular mt-2 flex gap-4 text-xs">
                    <span className="text-income">
                      +{formatVND(person.lendingTotal)}
                    </span>
                    <span className="text-expense">
                      −{formatVND(person.borrowingTotal)}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {t("loans.openCount", { n: person.openCount })}
                    </span>
                  </div>
                </CardContent>
                <div className="flex flex-col gap-2 p-3">
                  {personLoans.map((loan) => (
                    <LoanSummaryRow
                      key={loan.id}
                      loan={loan}
                      onOpen={() => setDetailLoanId(loan.id)}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {loans.length > 0 && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-4" />
          {t("loans.newLoan")}
        </button>
      )}
      <LoanOverlays
        variant="mobile"
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        detailLoanId={detailLoanId}
        onDetailLoanIdChange={setDetailLoanId}
      />
    </MobilePageContainer>
  );
}
