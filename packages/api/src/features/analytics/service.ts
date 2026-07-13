import {
  balanceTrendResponseSchema,
  computeBalanceTrend,
  computeLoansSummary,
  computeNetWorthSnapshot,
  computeNetWorthTrend,
  dashboardSummaryResponseSchema,
  monthFilterSchema,
  netWorthTrendResponseSchema,
  type Account,
  type Transaction,
} from "@wallet/shared";
import { z } from "zod";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

function currentMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseReferenceMonth(referenceMonthParam?: string): string {
  if (referenceMonthParam === undefined) return currentMonthIso();

  const parsed = monthFilterSchema.safeParse(referenceMonthParam);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid referenceMonth query", z.flattenError(parsed.error));
  }
  return parsed.data;
}

/** Active accounts plus every transaction posted against one of them — the base dataset
 * every account-total-derived report (balance trend, net worth, net-worth trend) starts
 * from. */
async function loadActiveAccountTransactions(
  userId: string,
): Promise<{ accounts: Account[]; transactions: Transaction[] }> {
  const accounts = await repository.listActiveAccounts(userId);
  const accountIds = new Set(accounts.map((account) => account.id));
  const transactions = (await repository.listTransactions(userId)).filter((tx) =>
    accountIds.has(tx.accountId),
  );
  return { accounts, transactions };
}

export async function getBalanceTrend(userId: string, referenceMonthParam?: string) {
  const referenceMonth = parseReferenceMonth(referenceMonthParam);
  const { accounts, transactions } = await loadActiveAccountTransactions(userId);
  const startingBalance = accounts.reduce((sum, account) => sum + account.openingBalance, 0);

  const response = balanceTrendResponseSchema.safeParse({
    data: computeBalanceTrend(transactions, startingBalance, referenceMonth),
  });

  if (!response.success) {
    throw new ApiError(500, "Balance trend failed validation", z.flattenError(response.error));
  }

  return response.data;
}

export async function getDashboardSummary(userId: string, todayIso: string) {
  const [{ accounts, transactions }, loansWithEvents] = await Promise.all([
    loadActiveAccountTransactions(userId),
    repository.listLoansWithEvents(userId),
  ]);

  const transactionsThroughToday = transactions.filter((tx) => tx.date <= todayIso);
  const loansForNetWorth = loansWithEvents.map(({ loan, events }) => ({
    direction: loan.direction,
    events,
  }));

  const response = dashboardSummaryResponseSchema.safeParse({
    data: {
      netWorth: computeNetWorthSnapshot(accounts, transactionsThroughToday, loansForNetWorth),
      loans: computeLoansSummary(loansWithEvents, todayIso),
    },
  });

  if (!response.success) {
    throw new ApiError(500, "Dashboard summary failed validation", z.flattenError(response.error));
  }

  return response.data;
}

export async function getNetWorthTrend(userId: string, referenceMonthParam?: string) {
  const referenceMonth = parseReferenceMonth(referenceMonthParam);
  const [{ accounts, transactions }, loansWithEvents] = await Promise.all([
    loadActiveAccountTransactions(userId),
    repository.listLoansWithEvents(userId),
  ]);

  const loansForNetWorth = loansWithEvents.map(({ loan, events }) => ({
    direction: loan.direction,
    events,
  }));

  const response = netWorthTrendResponseSchema.safeParse({
    data: computeNetWorthTrend(accounts, transactions, loansForNetWorth, referenceMonth),
  });

  if (!response.success) {
    throw new ApiError(500, "Net worth trend failed validation", z.flattenError(response.error));
  }

  return response.data;
}
