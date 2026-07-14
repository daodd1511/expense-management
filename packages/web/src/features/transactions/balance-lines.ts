import type { Transaction } from "@/core/types";
import { formatVND } from "@/shared/lib/format";

type AccountNameLookup = (accountId: string | null | undefined) => string | undefined;

export type TransactionBalanceEntry = {
  accountId: string;
  accountName: string;
  formattedAmount: string;
};

/** Returns structured post-transaction balances for layout-specific rendering. */
export function getTransactionBalanceEntries(
  transaction: Transaction,
  balanceAccountId: string | undefined,
  getAccountName: AccountNameLookup,
): TransactionBalanceEntry[] {
  if (typeof transaction.balanceAfter !== "number") return [];

  const source = {
    accountId: transaction.accountId,
    accountName: getAccountName(transaction.accountId) ?? transaction.accountId,
    formattedAmount: formatVND(transaction.balanceAfter),
  };

  if (
    transaction.type !== "transfer" ||
    !transaction.toAccountId ||
    typeof transaction.toAccountBalanceAfter !== "number"
  ) {
    return [source];
  }

  const destination = {
    accountId: transaction.toAccountId,
    accountName: getAccountName(transaction.toAccountId) ?? transaction.toAccountId,
    formattedAmount: formatVND(transaction.toAccountBalanceAfter),
  };

  if (balanceAccountId === destination.accountId) return [destination];
  if (balanceAccountId === source.accountId) return [source];

  return [source, destination];
}

/** Returns the account balances a transaction row should expose in its current account context. */
export function getTransactionBalanceLines(
  transaction: Transaction,
  balanceAccountId: string | undefined,
  getAccountName: AccountNameLookup,
): string[] {
  const entries = getTransactionBalanceEntries(transaction, balanceAccountId, getAccountName);
  if (entries.length <= 1) return entries.map(({ formattedAmount }) => formattedAmount);
  return entries.map(({ accountName, formattedAmount }) => `${accountName}: ${formattedAmount}`);
}
