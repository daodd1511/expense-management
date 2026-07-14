import { AlertCircle, Plus, UsersRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/core/i18n";
import { useLoanSummaries, usePersonSummaries } from "@/features/loans/queries";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import {
  filterLoans,
  loanKpis,
  loansByPerson,
  type LoanDirectionFilter,
  type LoanStatusFilter,
} from "./loan-ui";
import { LoanFilters, LoanKpiGrid, LoanSummaryRow } from "./LoanOverviewParts";
import { LoanOverlays } from "./LoanOverlays";

export function DesktopLoans() {
  const { t } = useLang();
  const loansQuery = useLoanSummaries();
  const peopleQuery = usePersonSummaries();
  const loans = loansQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const [direction, setDirection] = useState<LoanDirectionFilter>("all");
  const [status, setStatus] = useState<LoanStatusFilter>("open-group");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const filteredLoans = filterLoans(loans, direction, status);
  const grouped = loansByPerson(filteredLoans);
  const visiblePeople = people.filter((person) => grouped.has(person.id));
  const activePersonId = visiblePeople.some((person) => person.id === selectedPersonId)
    ? selectedPersonId
    : (visiblePeople[0]?.id ?? null);
  const activePerson = people.find((person) => person.id === activePersonId);
  const activeLoans = activePersonId ? (grouped.get(activePersonId) ?? []) : [];
  const kpis = loanKpis(loans);

  if (loansQuery.isPending || peopleQuery.isPending) {
    return (
      <div className="grid grid-cols-4 gap-4" aria-label={t("loans.loading")}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }
  if (loansQuery.isError || peopleQuery.isError) {
    return (
      <div
        role="alert"
        className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-expense/30 bg-expense-muted/10 text-center"
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
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("loans.ledgerLabel")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("loans.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("loans.subtitle")}</p>
        </div>
        <Button className="h-10 rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("loans.newLoan")}
        </Button>
      </header>

      <LoanKpiGrid {...kpis} />
      <LoanFilters
        direction={direction}
        status={status}
        onDirectionChange={setDirection}
        onStatusChange={setStatus}
      />

      {loans.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
            <WalletCards className="size-6" />
          </span>
          <div>
            <h2 className="font-semibold">{t("loans.emptyTitle")}</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("loans.emptyMessage")}</p>
          </div>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            {t("loans.addFirst")}
          </Button>
        </div>
      ) : visiblePeople.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {t("loans.noMatches")}
        </div>
      ) : (
        <div className="grid min-h-[28rem] grid-cols-[19rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border bg-card">
          <aside className="border-r border-border bg-muted/20 p-3">
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <UsersRound className="size-3.5" />
              {t("loans.people")}
            </div>
            <div className="flex flex-col gap-1.5">
              {visiblePeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    activePersonId === person.id
                      ? "border-primary/40 bg-accent"
                      : "border-transparent hover:bg-muted",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{person.name}</span>
                    {person.overdueCount > 0 && (
                      <span className="rounded-full bg-expense px-1.5 py-0.5 text-[10px] font-bold text-expense-foreground">
                        {person.overdueCount}
                      </span>
                    )}
                  </span>
                  <span className="tabular mt-1 block text-xs text-muted-foreground">
                    {t("loans.netShort")}:{" "}
                    <span className={person.netPosition >= 0 ? "text-income" : "text-expense"}>
                      {formatVND(person.netPosition)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <section className="flex flex-col p-5">
            {activePerson && (
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-semibold">{activePerson.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t("loans.openCount", { n: activePerson.openCount })}
                  </p>
                </div>
                <div className="flex gap-5 text-right text-xs">
                  <span>
                    <span className="block text-muted-foreground">{t("loans.owedToUser")}</span>
                    <strong className="tabular text-income">
                      {formatVND(activePerson.lendingTotal)}
                    </strong>
                  </span>
                  <span>
                    <span className="block text-muted-foreground">{t("loans.userOwes")}</span>
                    <strong className="tabular text-expense">
                      {formatVND(activePerson.borrowingTotal)}
                    </strong>
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {activeLoans.map((loan) => (
                <LoanSummaryRow key={loan.id} loan={loan} onOpen={() => setDetailLoanId(loan.id)} />
              ))}
            </div>
          </section>
        </div>
      )}

      <LoanOverlays
        variant="desktop"
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        detailLoanId={detailLoanId}
        onDetailLoanIdChange={setDetailLoanId}
      />
    </div>
  );
}
