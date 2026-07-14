import type { Transaction, TxType } from "@/core/types";
import { todayLocalMonthIso } from "@/shared/lib/date";

export type TransactionFilterType = TxType | "all";

export interface TransactionsViewState {
  month: string;
  query: string;
  type: TransactionFilterType;
  categoryIds: string[];
  accountIds: string[];
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
    categoryIds: [],
    accountIds: [],
  };
}

function parseIdList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
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
  const categoryIds = parseIdList(search.categoryId);
  const accountIds = parseIdList(search.accountId);

  return { month, query, type, categoryIds, accountIds };
}

export function buildTransactionsSearch(
  state: TransactionsViewState,
): Record<string, string | undefined> {
  const defaults = defaultTransactionsViewState();
  return {
    month: state.month === defaults.month ? undefined : state.month,
    query: state.query || undefined,
    type: state.type === defaults.type ? undefined : state.type,
    categoryId: state.categoryIds.length > 0 ? state.categoryIds.join(",") : undefined,
    accountId: state.accountIds.length > 0 ? state.accountIds.join(",") : undefined,
  };
}

export function matchesTransactionSelection(
  transaction: Transaction,
  categoryIds: readonly string[],
  accountIds: readonly string[],
): boolean {
  const categoryMatches =
    categoryIds.length === 0 ||
    (transaction.categoryId !== null && categoryIds.includes(transaction.categoryId));
  const accountMatches =
    accountIds.length === 0 ||
    accountIds.includes(transaction.accountId) ||
    (transaction.toAccountId != null && accountIds.includes(transaction.toAccountId));

  return categoryMatches && accountMatches;
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
