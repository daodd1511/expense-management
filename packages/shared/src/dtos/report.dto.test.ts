import { describe, expect, it } from "vitest";
import { incomeExpenseReportResponseSchema } from "./report.dto";

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
