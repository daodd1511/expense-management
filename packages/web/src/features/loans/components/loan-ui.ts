import type { TranslationKey } from "@/core/i18n";
import type { LoanDirection, LoanStatus, LoanSummary } from "@wallet/shared";

export type LoanDirectionFilter = "all" | LoanDirection;
export type LoanStatusFilter = "open-group" | "all" | LoanStatus;

const OPEN_STATUSES = new Set<LoanStatus>(["open", "due-soon", "overdue"]);

export function isOpenLoan(status: LoanStatus): boolean {
  return OPEN_STATUSES.has(status);
}

export function filterLoans(
  loans: readonly LoanSummary[],
  direction: LoanDirectionFilter,
  status: LoanStatusFilter,
): LoanSummary[] {
  return loans
    .filter((loan) => direction === "all" || loan.direction === direction)
    .filter((loan) => {
      if (status === "all") return true;
      if (status === "open-group") return isOpenLoan(loan.status);
      return loan.status === status;
    })
    .sort((a, b) => {
      const overdue = Number(b.status === "overdue") - Number(a.status === "overdue");
      if (overdue !== 0) return overdue;
      const dueDate = (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      if (dueDate !== 0) return dueDate;
      return (b.originalDate ?? "").localeCompare(a.originalDate ?? "");
    });
}

export function loansByPerson(loans: readonly LoanSummary[]): Map<string, LoanSummary[]> {
  const grouped = new Map<string, LoanSummary[]>();
  for (const loan of loans) {
    const personLoans = grouped.get(loan.personId) ?? [];
    personLoans.push(loan);
    grouped.set(loan.personId, personLoans);
  }
  return grouped;
}

export function loanKpis(loans: readonly LoanSummary[]) {
  const owedToUser = loans
    .filter((loan) => loan.direction === "lending")
    .reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const userOwes = loans
    .filter((loan) => loan.direction === "borrowing")
    .reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  return {
    owedToUser,
    userOwes,
    netPosition: owedToUser - userOwes,
    overdueCount: loans.filter((loan) => loan.status === "overdue").length,
  };
}

export const LOAN_STATUS_KEYS: Record<LoanStatus, TranslationKey> = {
  open: "loans.statusOpen",
  "due-soon": "loans.statusDueSoon",
  overdue: "loans.statusOverdue",
  repaid: "loans.statusRepaid",
  "written-off": "loans.statusWrittenOff",
  forgiven: "loans.statusForgiven",
};

export const LOAN_EVENT_KEYS = {
  disbursement: "loans.eventDisbursement",
  opening: "loans.eventOpening",
  repayment: "loans.eventRepayment",
  write_off: "loans.eventWriteOff",
  forgiveness: "loans.eventForgiveness",
} as const satisfies Record<string, TranslationKey>;
