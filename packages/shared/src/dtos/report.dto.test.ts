import { describe, expect, it } from "vitest";
import {
  financialPositionResponseSchema,
  incomeExpenseReportResponseSchema,
  spendingAnalysisReportResponseSchema,
} from "./report.dto";

describe("incomeExpenseReportResponseSchema", () => {
  it("accepts a valid report payload", () => {
    expect(
      incomeExpenseReportResponseSchema.parse({
        data: {
          range: {
            from: "2026-07-01",
            to: "2026-08-31",
            granularity: "month",
          },
          totals: {
            income: 1000,
            expense: 400,
            net: 600,
            transactionCount: 2,
          },
          series: [
            {
              period: "2026-07",
              income: 1000,
              expense: 400,
              net: 600,
            },
          ],
          categories: [
            {
              categoryId: "cat-1",
              parentCategoryId: null,
              type: "expense",
              amount: 400,
              transactionCount: 1,
              percentage: 1,
              transactions: [
                {
                  id: "tx-1",
                  date: "2026-07-01",
                  merchant: "Coffee",
                  amount: 400,
                  accountId: "acc-1",
                },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({
      data: {
        totals: {
          income: 1000,
          expense: 400,
          net: 600,
          transactionCount: 2,
        },
      },
    });
  });
});

describe("financialPositionResponseSchema", () => {
  it("accepts a valid financial position payload", () => {
    const boundary = {
      accountTotal: 1_000_000,
      lendingOutstanding: 100_000,
      borrowingOutstanding: 0,
      netWorth: 1_100_000,
    };

    const result = financialPositionResponseSchema.parse({
      data: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        opening: boundary,
        closing: boundary,
        income: 300_000,
        expense: 100_000,
        surplus: 200_000,
        loanCashFlow: {
          lent: 0,
          borrowed: 0,
          lendingRepaymentsReceived: 0,
          borrowingRepaymentsPaid: 0,
          net: 0,
        },
        balanceAdjustments: 0,
        writeOffs: 0,
        forgiveness: 0,
        openingLoanAdjustments: { lending: 0, borrowing: 0 },
        reconciliation: {
          accountTotal: { expected: 1_000_000, actual: 1_000_000, matches: true },
          netWorth: { expected: 1_100_000, actual: 1_100_000, matches: true },
        },
      },
    });

    expect(result.data.reconciliation.accountTotal.matches).toBe(true);
  });
});

describe("spendingAnalysisReportResponseSchema", () => {
  function baseChange(overrides: Partial<{ current: number; previous: number; change: number; changePercentage: number | null }> = {}) {
    return { current: 0, previous: 0, change: 0, changePercentage: 0, ...overrides };
  }

  it("accepts a valid spending analysis payload", () => {
    const result = spendingAnalysisReportResponseSchema.parse({
      data: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        comparisonRange: { from: "2026-06-01", to: "2026-06-30" },
        trendGranularity: "day",
        totals: baseChange({ current: 1000, previous: 500, change: 500, changePercentage: 1 }),
        trend: [
          {
            index: 0,
            periodStart: "2026-07-01",
            periodEnd: "2026-07-01",
            comparisonPeriodStart: "2026-06-01",
            comparisonPeriodEnd: "2026-06-01",
            current: 100,
            previous: 50,
          },
        ],
        categories: [
          {
            categoryId: "cat-food",
            ...baseChange({ current: 1000, previous: 500, change: 500, changePercentage: 1 }),
            share: 1,
            transactionCount: 1,
            transactions: [
              { id: "tx-1", date: "2026-07-01", merchant: "Market", amount: 1000, accountId: "acc-1" },
            ],
            children: [
              {
                categoryId: "cat-coffee",
                ...baseChange({ current: 0, previous: 500, change: -500, changePercentage: -1 }),
                share: 0,
                transactionCount: 0,
                transactions: [],
              },
            ],
          },
          {
            categoryId: null,
            ...baseChange({ current: 0, previous: 0, change: 0, changePercentage: 0 }),
            share: 0,
            transactionCount: 0,
            transactions: [],
            children: [],
          },
        ],
      },
    });

    expect(result.data.totals.changePercentage).toBe(1);
    expect(result.data.categories[1]?.categoryId).toBeNull();
  });

  it("represents a zero-baseline positive change as a null percentage", () => {
    const result = spendingAnalysisReportResponseSchema.parse({
      data: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        comparisonRange: { from: "2026-06-01", to: "2026-06-30" },
        trendGranularity: "day",
        totals: baseChange({ current: 1000, previous: 0, change: 1000, changePercentage: null }),
        trend: [],
        categories: [],
      },
    });

    expect(result.data.totals.changePercentage).toBeNull();
  });

  it("allows a null comparison period on a trend point when the comparison range ran out of buckets", () => {
    const result = spendingAnalysisReportResponseSchema.parse({
      data: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        comparisonRange: { from: "2026-06-01", to: "2026-06-30" },
        trendGranularity: "day",
        totals: baseChange(),
        trend: [
          {
            index: 30,
            periodStart: "2026-07-31",
            periodEnd: "2026-07-31",
            comparisonPeriodStart: null,
            comparisonPeriodEnd: null,
            current: 100,
            previous: 0,
          },
        ],
        categories: [],
      },
    });

    expect(result.data.trend[0]?.comparisonPeriodStart).toBeNull();
  });
});
