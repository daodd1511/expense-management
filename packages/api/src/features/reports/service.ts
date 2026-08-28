import {
  buildSpendingTrendBuckets,
  computeFinancialPosition,
  computeSpendingChange,
  computeSpendingComparisonRange,
  financialPositionResponseSchema,
  incomeExpenseReportResponseSchema,
  resolveSpendingTrendGranularity,
  spendingAnalysisReportResponseSchema,
  type FinancialPositionResponse,
  type IncomeExpenseReportResponse,
  type ReportCategoryAggregate,
  type ReportTransactionRow,
  type SpendingAnalysisPreset,
  type SpendingAnalysisReportResponse,
  type SpendingCategoryAggregate,
  type SpendingCategoryChildAggregate,
  type Transaction,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthRange(from: string, to: string) {
  const [startYear, startMonth] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const last = new Date(Date.UTC(endYear, endMonth - 1, 1));
  const months: string[] = [];

  while (cursor <= last) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function sortCategoryTransactions(transactions: ReportTransactionRow[]) {
  return [...transactions].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    if (dateOrder !== 0) return dateOrder;
    return left.merchant.localeCompare(right.merchant);
  });
}

function percentageOf(amount: number, total: number) {
  if (total === 0) return 0;
  return amount / total;
}

export async function getIncomeExpenseReport(
  db: AppDb,
  userId: string,
  from: string,
  to: string,
): Promise<IncomeExpenseReportResponse> {
  const transactions = await repository.listReportTransactions(db, userId, from, to);
  // Explicit income | expense, not "not transfer" — a catch-all would silently fold loan
  // rows into the expense branch below (PLAN.md -> "Transaction Model").
  const reportableTransactions = transactions.filter(
    (transaction): transaction is typeof transaction & { type: "income" | "expense" } =>
      transaction.type === "income" || transaction.type === "expense",
  );
  const categoryIds = [
    ...new Set(
      reportableTransactions
        .map((transaction) => transaction.categoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const categories = await repository.listReportCategories(db, userId, categoryIds);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const periods = monthRange(from.slice(0, 7), to.slice(0, 7));

  const totals = {
    income: 0,
    expense: 0,
    net: 0,
    transactionCount: 0,
  };

  const series = new Map(
    periods.map((period) => [
      period,
      {
        period,
        income: 0,
        expense: 0,
        net: 0,
      },
    ]),
  );

  type CategoryDraft = Omit<ReportCategoryAggregate, "percentage"> & {
    transactions: ReportTransactionRow[];
  };

  const categoryGroups = new Map<string, CategoryDraft>();

  for (const transaction of reportableTransactions) {
    const hiddenCategory = transaction.categoryId
      ? categoryById.get(transaction.categoryId)
      : undefined;
    if (hiddenCategory?.isHidden && hiddenCategory.name === "Balance Adjustment") {
      continue;
    }

    totals.transactionCount += 1;

    if (transaction.type === "income") {
      totals.income += transaction.amount;
    } else {
      totals.expense += transaction.amount;
    }

    const period = monthKey(transaction.date);
    const seriesPoint = series.get(period);
    if (seriesPoint) {
      if (transaction.type === "income") {
        seriesPoint.income += transaction.amount;
      } else {
        seriesPoint.expense += transaction.amount;
      }
      seriesPoint.net = seriesPoint.income - seriesPoint.expense;
    }

    if (!transaction.categoryId) {
      continue;
    }

    const category = categoryById.get(transaction.categoryId);
    const type = category?.type ?? (transaction.type === "income" ? "income" : "expense");
    const key = `${type}:${transaction.categoryId}`;
    const group =
      categoryGroups.get(key) ??
      (() => {
        const nextGroup: CategoryDraft = {
          categoryId: transaction.categoryId,
          parentCategoryId: category?.parentId ?? null,
          type,
          amount: 0,
          transactionCount: 0,
          transactions: [],
        };
        categoryGroups.set(key, nextGroup);
        return nextGroup;
      })();

    group.amount += transaction.amount;
    group.transactionCount += 1;
    group.transactions.push({
      id: transaction.id,
      date: transaction.date,
      merchant: transaction.merchant,
      note: transaction.note,
      amount: transaction.amount,
      accountId: transaction.accountId,
    });
  }

  totals.net = totals.income - totals.expense;

  const categorySummaries = [...categoryGroups.values()]
    .map((group) => {
      const typeTotal = group.type === "income" ? totals.income : totals.expense;
      return {
        categoryId: group.categoryId,
        parentCategoryId: group.parentCategoryId,
        type: group.type,
        amount: group.amount,
        transactionCount: group.transactionCount,
        percentage: percentageOf(group.amount, typeTotal),
        transactions: sortCategoryTransactions(group.transactions),
      };
    })
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "expense" ? -1 : 1;
      }
      if (right.amount !== left.amount) {
        return right.amount - left.amount;
      }
      return left.categoryId.localeCompare(right.categoryId);
    });

  const response = incomeExpenseReportResponseSchema.safeParse({
    data: {
      range: {
        from,
        to,
        granularity: "month",
      },
      totals,
      series: periods.map((period) => {
        const seriesPoint = series.get(period);
        if (!seriesPoint) {
          throw new ApiError(500, "Report series failed validation");
        }

        return seriesPoint;
      }),
      categories: categorySummaries,
    },
  });

  if (!response.success) {
    throw new ApiError(500, "Income vs expense report failed validation", response.error.flatten());
  }

  return response.data;
}

export async function getFinancialPosition(
  db: AppDb,
  userId: string,
  from: string,
  to: string,
): Promise<FinancialPositionResponse> {
  const [accounts, transactionsThroughTo, loans, balanceAdjustmentCategoryIds] = await Promise.all([
    repository.listAccountsForPosition(db, userId),
    repository.listTransactionsThroughDate(db, userId, to),
    repository.listLoansWithEventsForPosition(db, userId),
    repository.listBalanceAdjustmentCategoryIds(db),
  ]);

  const balanceAdjustmentTransactionIds = new Set(
    transactionsThroughTo
      .filter((tx) => tx.categoryId && balanceAdjustmentCategoryIds.has(tx.categoryId))
      .map((tx) => tx.id),
  );

  const report = computeFinancialPosition({
    accounts,
    transactionsThroughTo,
    loans,
    from,
    to,
    balanceAdjustmentTransactionIds,
  });

  const response = financialPositionResponseSchema.safeParse({ data: report });
  if (!response.success) {
    throw new ApiError(
      500,
      "Financial position report failed validation",
      response.error.flatten(),
    );
  }

  return response.data;
}

function toReportTransactionRow(transaction: Transaction): ReportTransactionRow {
  return {
    id: transaction.id,
    date: transaction.date,
    merchant: transaction.merchant,
    note: transaction.note,
    amount: transaction.amount,
    accountId: transaction.accountId,
  };
}

type SpendingCategoryDraft = {
  categoryId: string | null;
  current: number;
  previous: number;
  transactionCount: number;
  transactions: ReportTransactionRow[];
  children: Map<string, SpendingCategoryChildDraft>;
};

type SpendingCategoryChildDraft = {
  categoryId: string;
  current: number;
  previous: number;
  transactionCount: number;
  transactions: ReportTransactionRow[];
};

export async function getSpendingAnalysisReport(
  db: AppDb,
  userId: string,
  from: string,
  to: string,
  preset: SpendingAnalysisPreset,
): Promise<SpendingAnalysisReportResponse> {
  const comparisonRange = computeSpendingComparisonRange(from, to, preset);

  // A single query spans both windows (and the gap between them, for presets whose
  // comparison range isn't adjacent to the current range) — cheaper than two round
  // trips; transactions outside both windows are simply dropped below.
  const transactions = await repository.listReportTransactions(
    db,
    userId,
    comparisonRange.from,
    to,
  );
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");

  const categoryIds = [
    ...new Set(
      expenseTransactions
        .map((transaction) => transaction.categoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const categories = await repository.listReportCategories(db, userId, categoryIds);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // Same "Balance Adjustment" exclusion as getIncomeExpenseReport: checked inline
  // against categories already fetched above, rather than a second repository call.
  const spendingTransactions = expenseTransactions.filter((transaction) => {
    const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
    return !(category?.isHidden && category.name === "Balance Adjustment");
  });

  const currentTransactions = spendingTransactions.filter(
    (transaction) => transaction.date >= from && transaction.date <= to,
  );
  const previousTransactions = spendingTransactions.filter(
    (transaction) =>
      transaction.date >= comparisonRange.from && transaction.date <= comparisonRange.to,
  );

  const draftsByKey = new Map<string, SpendingCategoryDraft>();

  function getOrCreateDraft(key: string, categoryId: string | null): SpendingCategoryDraft {
    const existing = draftsByKey.get(key);
    if (existing) return existing;

    const draft: SpendingCategoryDraft = {
      categoryId,
      current: 0,
      previous: 0,
      transactionCount: 0,
      transactions: [],
      children: new Map(),
    };
    draftsByKey.set(key, draft);
    return draft;
  }

  function resolveDraftKey(transaction: Transaction): {
    key: string;
    categoryId: string | null;
    childCategoryId: string | null;
  } {
    if (!transaction.categoryId) {
      return { key: "uncategorized", categoryId: null, childCategoryId: null };
    }

    const category = categoryById.get(transaction.categoryId);
    const parentCategoryId = category?.parentId ?? null;
    if (!parentCategoryId) {
      return {
        key: transaction.categoryId,
        categoryId: transaction.categoryId,
        childCategoryId: null,
      };
    }

    return {
      key: parentCategoryId,
      categoryId: parentCategoryId,
      childCategoryId: transaction.categoryId,
    };
  }

  for (const transaction of currentTransactions) {
    const { key, categoryId, childCategoryId } = resolveDraftKey(transaction);
    const draft = getOrCreateDraft(key, categoryId);
    draft.current += transaction.amount;

    if (childCategoryId) {
      const childDraft = draft.children.get(childCategoryId) ?? {
        categoryId: childCategoryId,
        current: 0,
        previous: 0,
        transactionCount: 0,
        transactions: [],
      };
      childDraft.current += transaction.amount;
      childDraft.transactionCount += 1;
      childDraft.transactions.push(toReportTransactionRow(transaction));
      draft.children.set(childCategoryId, childDraft);
    } else {
      draft.transactionCount += 1;
      draft.transactions.push(toReportTransactionRow(transaction));
    }
  }

  for (const transaction of previousTransactions) {
    const { key, categoryId, childCategoryId } = resolveDraftKey(transaction);
    const draft = getOrCreateDraft(key, categoryId);
    draft.previous += transaction.amount;

    if (childCategoryId) {
      const childDraft = draft.children.get(childCategoryId) ?? {
        categoryId: childCategoryId,
        current: 0,
        previous: 0,
        transactionCount: 0,
        transactions: [],
      };
      childDraft.previous += transaction.amount;
      draft.children.set(childCategoryId, childDraft);
    }
  }

  const currentTotal = currentTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const previousTotal = previousTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  function shareOf(amount: number, total: number): number {
    return total === 0 ? 0 : amount / total;
  }

  const categorySummaries: SpendingCategoryAggregate[] = [...draftsByKey.values()]
    .map((draft): SpendingCategoryAggregate => {
      const children: SpendingCategoryChildAggregate[] = [...draft.children.values()]
        .map((child) => ({
          categoryId: child.categoryId,
          current: child.current,
          previous: child.previous,
          ...computeSpendingChange(child.current, child.previous),
          share: shareOf(child.current, draft.current),
          transactionCount: child.transactionCount,
          transactions: sortCategoryTransactions(child.transactions),
        }))
        .sort((left, right) => right.current - left.current);

      return {
        categoryId: draft.categoryId,
        current: draft.current,
        previous: draft.previous,
        ...computeSpendingChange(draft.current, draft.previous),
        share: shareOf(draft.current, currentTotal),
        transactionCount: draft.transactionCount,
        transactions: sortCategoryTransactions(draft.transactions),
        children,
      };
    })
    .sort((left, right) => right.current - left.current);

  const trendGranularity = resolveSpendingTrendGranularity(from, to);
  const currentBuckets = buildSpendingTrendBuckets(from, to, trendGranularity);
  const previousBuckets = buildSpendingTrendBuckets(
    comparisonRange.from,
    comparisonRange.to,
    trendGranularity,
  );

  const trend = currentBuckets.map((bucket, index) => {
    const previousBucket = previousBuckets[index];
    const current = currentTransactions
      .filter((transaction) => transaction.date >= bucket.start && transaction.date <= bucket.end)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const previousAmount = previousBucket
      ? previousTransactions
          .filter(
            (transaction) =>
              transaction.date >= previousBucket.start && transaction.date <= previousBucket.end,
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0)
      : 0;

    return {
      index,
      periodStart: bucket.start,
      periodEnd: bucket.end,
      comparisonPeriodStart: previousBucket?.start ?? null,
      comparisonPeriodEnd: previousBucket?.end ?? null,
      current,
      previous: previousAmount,
    };
  });

  const response = spendingAnalysisReportResponseSchema.safeParse({
    data: {
      range: { from, to },
      comparisonRange,
      trendGranularity,
      totals: {
        current: currentTotal,
        previous: previousTotal,
        ...computeSpendingChange(currentTotal, previousTotal),
      },
      trend,
      categories: categorySummaries,
    },
  });

  if (!response.success) {
    throw new ApiError(500, "Spending analysis report failed validation", response.error.flatten());
  }

  return response.data;
}
