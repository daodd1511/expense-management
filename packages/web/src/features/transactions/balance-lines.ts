import type { Transaction } from "@/core/types";
import { formatVND } from "@/shared/lib/format";

type AccountNameLookup = (accountId: string | null | undefined) => string | undefined;

/** Returns the account balances a transaction row should expose in its current account context. */
export function getTransactionBalanceLines(
  transaction: Transaction,
  balanceAccountId: string | undefined,
  getAccountName: AccountNameLookup,
): string[] {
  if (typeof transaction.balanceAfter !== "number") return [];

  if (
    transaction.type !== "transfer" ||
    !transaction.toAccountId ||
    typeof transaction.toAccountBalanceAfter !== "number"
  ) {
    return [formatVND(transaction.balanceAfter)];
  }

  if (balanceAccountId === transaction.toAccountId)
    return [formatVND(transaction.toAccountBalanceAfter)];
  if (balanceAccountId === transaction.accountId) return [formatVND(transaction.balanceAfter)];

  return [
    `${getAccountName(transaction.accountId) ?? transaction.accountId}: ${formatVND(transaction.balanceAfter)}`,
    `${getAccountName(transaction.toAccountId) ?? transaction.toAccountId}: ${formatVND(transaction.toAccountBalanceAfter)}`,
  ];
}
