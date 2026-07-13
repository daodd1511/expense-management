import { describe, expect, it } from "vitest";
import { financialPositionResponseSchema, incomeExpenseReportResponseSchema } from "./report.dto";

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
