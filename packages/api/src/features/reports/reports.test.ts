import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv } from "../../middleware/auth";
import { handleError } from "../../middleware/error";

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  getSupabase,
}));

import { reportsRouter } from "./routes";

function buildQueryBuilder(data: unknown[]) {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(async () => ({ data, error: null })),
  };

  return builder;
}

function buildClient({
  categories,
  transactions,
}: {
  categories: unknown[];
  transactions: unknown[];
}) {
  const transactionsBuilder = buildQueryBuilder(transactions);
  const categoriesBuilder = buildQueryBuilder(categories);
  const from = vi.fn((table: string) => {
    if (table === "transactions") return transactionsBuilder;
    if (table === "categories") return categoriesBuilder;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from, transactionsBuilder, categoriesBuilder };
}

function makeApp() {
  const app = new Hono<AuthEnv>();
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("userId", "user-1");
    await next();
  });
  app.route("/reports", reportsRouter);
  return app;
}

describe("reportsRouter", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("returns monthly income vs expense report with transfer excluded", async () => {
    const client = buildClient({
      categories: [
        {
          id: "cat-salary",
          owner_id: null,
          name: "Salary",
          icon: "Briefcase",
          color: "chart-1",
          is_hidden: false,
          type: "income",
          parent_id: null,
          created_at: "2020-01-01T00:00:00.000Z",
        },
        {
          id: "cat-food",
          owner_id: "user-1",
          name: "Food",
          icon: "Utensils",
          color: "chart-2",
          is_hidden: false,
          type: "expense",
          parent_id: null,
          created_at: "2020-01-01T00:00:00.000Z",
        },
        {
          id: "cat-coffee",
          owner_id: "user-1",
          name: "Coffee",
          icon: "Coffee",
          color: "chart-3",
          is_hidden: false,
          type: "expense",
          parent_id: "cat-food",
          created_at: "2020-01-01T00:00:00.000Z",
        },
        {
          id: "cat-adjustment-expense",
          owner_id: null,
          name: "Balance Adjustment",
          icon: "Scale",
          color: "chart-12",
          is_hidden: true,
          type: "expense",
          parent_id: null,
          created_at: "2020-01-01T00:00:00.000Z",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          owner_id: "user-1",
          type: "income",
          amount: 5000,
          category_id: "cat-salary",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Salary July",
          note: null,
          tx_date: "2026-07-01",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-07-01T08:00:00.000Z",
        },
        {
          id: "tx-2",
          owner_id: "user-1",
          type: "expense",
          amount: 1000,
          category_id: "cat-food",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Groceries",
          note: "Weekly run",
          tx_date: "2026-07-02",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-07-02T08:00:00.000Z",
        },
        {
          id: "tx-3",
          owner_id: "user-1",
          type: "expense",
          amount: 500,
          category_id: "cat-coffee",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Coffee shop",
          note: null,
          tx_date: "2026-07-04",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-07-04T08:00:00.000Z",
        },
        {
          id: "tx-4",
          owner_id: "user-1",
          type: "transfer",
          amount: 200,
          category_id: null,
          account_id: "acc-1",
          to_account_id: "acc-2",
          merchant: "Move money",
          note: null,
          tx_date: "2026-07-05",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-07-05T08:00:00.000Z",
        },
        {
          id: "tx-5",
          owner_id: "user-1",
          type: "income",
          amount: 7000,
          category_id: "cat-salary",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Salary August",
          note: null,
          tx_date: "2026-08-01",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-08-01T08:00:00.000Z",
        },
        {
          id: "tx-6",
          owner_id: "user-1",
          type: "expense",
          amount: 2000,
          category_id: "cat-food",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Market",
          note: null,
          tx_date: "2026-08-08",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-08-08T08:00:00.000Z",
        },
        {
          id: "tx-7",
          owner_id: "user-1",
          type: "expense",
          amount: 125,
          category_id: "cat-adjustment-expense",
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Balance adjustment",
          note: null,
          tx_date: "2026-08-10",
          receipt_url: null,
          subscription_id: null,
          created_at: "2026-08-10T08:00:00.000Z",
        },
      ],
    });

    getSupabase.mockReturnValue(client);

    const response = await makeApp().request(
      "/reports/income-expense?from=2026-07-01&to=2026-08-31",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        range: { from: "2026-07-01", to: "2026-08-31", granularity: "month" },
        totals: { income: 12000, expense: 3500, net: 8500, transactionCount: 5 },
        series: [
          { period: "2026-07", income: 5000, expense: 1500, net: 3500 },
          { period: "2026-08", income: 7000, expense: 2000, net: 5000 },
        ],
        categories: [
          {
            categoryId: "cat-food",
            parentCategoryId: null,
            type: "expense",
            amount: 3000,
            transactionCount: 2,
            percentage: 0.8571428571428571,
            transactions: [
              {
                id: "tx-6",
                date: "2026-08-08",
                merchant: "Market",
                amount: 2000,
                accountId: "acc-1",
              },
              {
                id: "tx-2",
                date: "2026-07-02",
                merchant: "Groceries",
                note: "Weekly run",
                amount: 1000,
                accountId: "acc-1",
              },
            ],
          },
          {
            categoryId: "cat-coffee",
            parentCategoryId: "cat-food",
            type: "expense",
            amount: 500,
            transactionCount: 1,
            percentage: 0.14285714285714285,
            transactions: [
              {
                id: "tx-3",
                date: "2026-07-04",
                merchant: "Coffee shop",
                amount: 500,
                accountId: "acc-1",
              },
            ],
          },
          {
            categoryId: "cat-salary",
            parentCategoryId: null,
            type: "income",
            amount: 12000,
            transactionCount: 2,
            percentage: 1,
            transactions: [
              {
                id: "tx-5",
                date: "2026-08-01",
                merchant: "Salary August",
                amount: 7000,
                accountId: "acc-1",
              },
              {
                id: "tx-1",
                date: "2026-07-01",
                merchant: "Salary July",
                amount: 5000,
                accountId: "acc-1",
              },
            ],
          },
        ],
      },
    });

    expect(client.transactionsBuilder.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(client.transactionsBuilder.gte).toHaveBeenCalledWith("tx_date", "2026-07-01");
    expect(client.transactionsBuilder.lte).toHaveBeenCalledWith("tx_date", "2026-08-31");
    expect(client.categoriesBuilder.in).toHaveBeenCalledWith("id", [
      "cat-salary",
      "cat-food",
      "cat-coffee",
      "cat-adjustment-expense",
    ]);
    expect(client.categoriesBuilder.or).toHaveBeenCalledWith("owner_id.eq.user-1,owner_id.is.null");
  });

  it("includes hidden Transfer Fee expenses in report totals", async () => {
    getSupabase.mockReturnValue(
      buildClient({
        categories: [
          {
            id: "fee",
            owner_id: null,
            name: "Transfer Fee",
            icon: "ArrowRightLeft",
            color: "chart-12",
            is_hidden: true,
            type: "expense",
            parent_id: null,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        transactions: [
          {
            id: "fee-tx",
            owner_id: "user-1",
            type: "expense",
            amount: 10,
            category_id: "fee",
            account_id: "cash",
            to_account_id: null,
            merchant: "Transfer Fee",
            note: null,
            tx_date: "2026-07-01",
            receipt_url: null,
            subscription_id: null,
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
    );

    const response = await makeApp().request(
      "/reports/income-expense?from=2026-07-01&to=2026-07-31",
    );
    await expect(response.json()).resolves.toMatchObject({
      data: {
        totals: { expense: 10, transactionCount: 1 },
        categories: [{ categoryId: "fee", amount: 10 }],
      },
    });
  });

  it("rejects an inverted date range", async () => {
    getSupabase.mockReturnValue(buildClient({ categories: [], transactions: [] }));

    const response = await makeApp().request(
      "/reports/income-expense?from=2026-08-31&to=2026-07-01",
    );

    expect(response.status).toBe(400);
  });
});
