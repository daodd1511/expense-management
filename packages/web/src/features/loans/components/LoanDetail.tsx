import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useLang } from "@/core/i18n";
import { useLoanDetail } from "@/features/loans/queries";
import { Button } from "@/shared/components/ui/button";
import { useSwipeActions } from "@/shared/hooks/useSwipeActions";
import { formatShortDate, formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { LoanDetail as LoanDetailModel, LoanEvent } from "@wallet/shared";
import { isOpenLoan, LOAN_EVENT_KEYS } from "./loan-ui";
import { LoanStatusBadge } from "./LoanOverviewParts";

const SWIPE_ACTION_WIDTH = 128;

function eventCashTone(loan: LoanDetailModel, event: LoanEvent) {
  if (event.kind === "opening" || event.kind === "write_off" || event.kind === "forgiveness") {
    return "text-muted-foreground";
  }
  const inflow =
    (event.kind === "disbursement" && loan.direction === "borrowing") ||
    (event.kind === "repayment" && loan.direction === "lending");
  return inflow ? "text-income" : "text-expense";
}

export function LoanDetail({
  loanId,
  variant,
  onBack,
  onRepay,
  onEditRepayment,
  onDeleteRepayment,
  onCorrectOrigin,
  onCloseLoan,
  onReopen,
  onDelete,
}: {
  loanId: string;
  variant: "mobile" | "desktop";
  onBack: () => void;
  onRepay: (loan: LoanDetailModel) => void;
  onEditRepayment: (loan: LoanDetailModel, event: LoanEvent) => void;
  onDeleteRepayment: (loan: LoanDetailModel, event: LoanEvent) => void;
  onCorrectOrigin: (loan: LoanDetailModel) => void;
  onCloseLoan: (loan: LoanDetailModel) => void;
  onReopen: (loan: LoanDetailModel) => void;
  onDelete: (loan: LoanDetailModel) => void;
}) {
  const { t } = useLang();
  const { data: loan, isPending, isError } = useLoanDetail(loanId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-5" aria-label={t("loans.loading")}>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (isError || !loan) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-expense">{t("loans.error")}</p>
        <Button variant="outline" onClick={onBack}>
          {t("loans.back")}
        </Button>
      </div>
    );
  }

  const origin = loan.events.find(
    (event) => event.kind === "disbursement" || event.kind === "opening",
  );
  const canCorrectOrigin =
    origin?.kind === "disbursement" && loan.status !== "written-off" && loan.status !== "forgiven";
  const open = isOpenLoan(loan.status);
  const closed = loan.status === "written-off" || loan.status === "forgiven";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("loans.back")}
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <LoanStatusBadge status={loan.status} />
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
        <section>
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.18em]",
              loan.direction === "lending" ? "text-income" : "text-expense",
            )}
          >
            {loan.direction === "lending" ? t("loans.lending") : t("loans.borrowing")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{loan.personName}</h2>
          {loan.description && <p className="text-sm text-muted-foreground">{loan.description}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-muted/25 p-4">
          <p className="text-xs text-muted-foreground">{t("loans.outstanding")}</p>
          <p
            className={cn(
              "tabular mt-1 text-3xl font-bold tracking-tight",
              loan.direction === "lending" ? "text-income" : "text-expense",
            )}
          >
            {formatVND(loan.outstandingBalance)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">{t("loans.originAmount")}</span>
              <span className="tabular font-medium">{formatVND(loan.originAmount)}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">{t("loans.dueDate")}</span>
              <span className="font-medium">
                {loan.dueDate ? formatShortDate(loan.dueDate) : t("loans.noDueDate")}
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("loans.eventHistory")}</h3>
          </div>
          <ol
            data-testid="loan-event-timeline"
            className="relative before:absolute before:inset-y-0 before:left-2 before:w-px before:-translate-x-1/2 before:bg-border before:content-['']"
          >
            {loan.events.map((event) => (
              <LoanEventHistoryRow
                key={event.id}
                loan={loan}
                event={event}
                variant={variant}
                editLabel={t("loans.editRepayment")}
                deleteLabel={t("loans.deleteRepayment")}
                eventLabel={t(LOAN_EVENT_KEYS[event.kind])}
                onEdit={() => onEditRepayment(loan, event)}
                onDelete={() => onDeleteRepayment(loan, event)}
              />
            ))}
          </ol>
        </section>

        {loan.note && (
          <section className="rounded-xl border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("form.note")}</p>
            <p className="mt-1 text-sm">{loan.note}</p>
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        {open && (
          <Button size="lg" onClick={() => onRepay(loan)}>
            <Plus className="size-4" />
            {t("loans.recordRepayment")}
          </Button>
        )}
        <div className="flex flex-col gap-2">
          <div data-testid="loan-lifecycle-actions" className="flex flex-wrap gap-2">
            {canCorrectOrigin && (
              <Button
                variant="outline"
                className="h-auto min-h-9 min-w-32 flex-1 whitespace-normal py-2 text-center leading-tight"
                onClick={() => onCorrectOrigin(loan)}
              >
                <Pencil className="size-4" />
                {t("loans.correctOrigin")}
              </Button>
            )}
            {open && (
              <Button
                variant="outline"
                className="h-auto min-h-9 min-w-32 flex-1 whitespace-normal py-2 text-center leading-tight"
                onClick={() => onCloseLoan(loan)}
              >
                <CircleDollarSign className="size-4" />
                {loan.direction === "lending" ? t("loans.writeOff") : t("loans.forgive")}
              </Button>
            )}
            {closed && (
              <Button
                variant="outline"
                className="h-auto min-h-9 min-w-32 flex-1 whitespace-normal py-2 text-center leading-tight"
                onClick={() => onReopen(loan)}
              >
                <RotateCcw className="size-4" />
                {t("loans.reopen")}
              </Button>
            )}
          </div>
          <div className="flex">
            <Button
              variant="ghost"
              className="w-full justify-center text-expense hover:bg-expense-muted hover:text-expense"
              onClick={() => onDelete(loan)}
            >
              <Trash2 className="size-4" />
              {t("loans.deleteLoan")}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LoanEventHistoryRow({
  loan,
  event,
  variant,
  eventLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  loan: LoanDetailModel;
  event: LoanEvent;
  variant: "mobile" | "desktop";
  eventLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH);
  const isRepayment = event.kind === "repayment";
  const swipe = variant === "mobile" && isRepayment;
  const eventSummary = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{eventLabel}</span>
        <span className="block text-xs text-muted-foreground">{formatShortDate(event.date)}</span>
      </span>
      <span
        data-testid={`loan-event-amount-${event.id}`}
        className={cn(
          "tabular w-32 shrink-0 whitespace-nowrap text-right text-sm font-semibold",
          eventCashTone(loan, event),
        )}
      >
        {formatVND(event.amount)}
      </span>
    </>
  );
  const mainContent =
    variant === "desktop" && isRepayment ? (
      <button
        type="button"
        data-testid={`loan-event-main-${event.id}`}
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {eventSummary}
      </button>
    ) : (
      <div
        data-testid={`loan-event-main-${event.id}`}
        className="flex min-w-0 flex-1 items-start justify-between gap-3"
      >
        {eventSummary}
      </div>
    );

  const content = (
    <div
      data-testid={`loan-event-${event.id}`}
      className={cn(
        "relative z-10 flex min-h-10 w-full items-start gap-1 bg-card pr-1",
        swipe && "touch-pan-y",
      )}
      style={
        swipe
          ? {
              transform: `translateX(${offset}px)`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }
          : undefined
      }
      onTouchStart={swipe ? bind.onTouchStart : undefined}
      onTouchMove={swipe ? bind.onTouchMove : undefined}
      onTouchEnd={swipe ? bind.onTouchEnd : undefined}
      onTouchCancel={swipe ? bind.onTouchCancel : undefined}
    >
      {mainContent}
    </div>
  );

  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
      <div className="relative" aria-hidden="true">
        <span
          data-testid={`loan-event-marker-${event.id}`}
          className="absolute top-1 left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full bg-primary"
        />
      </div>
      <div className="min-w-0">
        {swipe ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex">
              <button
                type="button"
                onClick={onEdit}
                aria-label={editLabel}
                className="flex w-16 items-center justify-center bg-accent text-accent-foreground"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={deleteLabel}
                className="flex w-16 items-center justify-center bg-expense text-expense-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </li>
  );
}
