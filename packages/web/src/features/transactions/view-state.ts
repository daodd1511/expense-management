import type { TxType } from "@/core/types";
import { todayLocalMonthIso } from "@/shared/lib/date";

export type TransactionFilterType = TxType | "all";

export interface TransactionsViewState {
  month: string;
  query: string;
  type: TransactionFilterType;
  categoryId: string;
  accountId: string;
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const TYPE_VALUES: readonly TransactionFilterType[] = [
  "all",
  "expense",
  "income",
  "transfer",
  "loan",
];

export function defaultTransactionsViewState(): TransactionsViewState {
  return {
    month: todayLocalMonthIso(),
    query: "",
    type: "all",
    categoryId: "",
    accountId: "",
  };
}

export function parseTransactionsViewState(search: Record<string, unknown>): TransactionsViewState {
  const defaults = defaultTransactionsViewState();
  const month =
    typeof search.month === "string" && MONTH_PATTERN.test(search.month)
      ? search.month
      : defaults.month;
  const query = typeof search.query === "string" ? search.query : defaults.query;
  const type =
    typeof search.type === "string" && TYPE_VALUES.includes(search.type as TransactionFilterType)
      ? (search.type as TransactionFilterType)
      : defaults.type;
  const categoryId =
    typeof search.categoryId === "string" ? search.categoryId : defaults.categoryId;
  const accountId = typeof search.accountId === "string" ? search.accountId : defaults.accountId;

  return { month, query, type, categoryId, accountId };
}

export function buildTransactionsSearch(
  state: TransactionsViewState,
): Record<string, string | undefined> {
  const defaults = defaultTransactionsViewState();
  return {
    month: state.month === defaults.month ? undefined : state.month,
    query: state.query || undefined,
    type: state.type === defaults.type ? undefined : state.type,
    categoryId: state.categoryId || undefined,
    accountId: state.accountId || undefined,
  };
}

export function monthFromHref(href: string): string {
  const defaults = defaultTransactionsViewState();
  try {
    const url = new URL(href, "http://local");
    const month = url.searchParams.get("month");
    return month && MONTH_PATTERN.test(month) ? month : defaults.month;
  } catch {
    return defaults.month;
  }
}
