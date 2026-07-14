import type { TranslationKey } from "@/core/i18n";
import { amountColorClass, formatSigned, formatVND } from "@/shared/lib/format";
import type { LoanEventLink, Transaction } from "@wallet/shared";

export function loanTransactionLabelKey(link: LoanEventLink | undefined): TranslationKey {
  if (!link) return "tx.loan";
  if (link.kind === "disbursement") {
    return link.direction === "lending" ? "tx.loanLent" : "tx.loanBorrowed";
  }
  if (link.kind === "repayment") {
    return link.direction === "lending" ? "tx.loanRepaymentReceived" : "tx.loanRepaymentPaid";
  }
  return "tx.loan";
}

export function transactionAmountLabel(transaction: Transaction): string {
  if (transaction.type !== "loan") return formatSigned(transaction.amount, transaction.type);
  const amount = formatVND(transaction.amount);
  if (transaction.cashFlowDirection === "inflow") return `+${amount}`;
  if (transaction.cashFlowDirection === "outflow") return `−${amount}`;
  return amount;
}

export function transactionAmountClass(transaction: Transaction): string {
  if (transaction.type !== "loan") return amountColorClass(transaction.type);
  return transaction.cashFlowDirection === "inflow" ? "text-income" : "text-expense";
}
