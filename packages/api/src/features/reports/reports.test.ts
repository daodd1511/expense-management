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
    is: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    then: (
      resolve: (value: { data: unknown[]; error: null }) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve({ data, error: null }).then(resolve, reject),
  };

  return builder;
}

function buildClient({
  categories,
  transactions,
  accounts = [],
  loans = [],
  loanEvents = [],
}: {
  categories: unknown[];
  transactions: unknown[];
  accounts?: unknown[];
  loans?: unknown[];
  loanEvents?: unknown[];
}) {
  const transactionsBuilder = buildQueryBuilder(transactions);
  const categoriesBuilder = buildQueryBuilder(categories);
  const accountsBuilder = buildQueryBuilder(accounts);
  const loansBuilder = buildQueryBuilder(loans);
  const loanEventsBuilder = buildQueryBuilder(loanEvents);
  const from = vi.fn((table: string) => {
    if (table === "transactions") return transactionsBuilder;
    if (table === "categories") return categoriesBuilder;
    if (table === "accounts") return accountsBuilder;
    if (table === "loans") return loansBuilder;
    if (table === "loan_events") return loanEventsBuilder;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    transactionsBuilder,
    categoriesBuilder,
    accountsBuilder,
    loansBuilder,
    loanEventsBuilder,
  };
}

function makeLoanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "loan-1",
    owner_id: "user-1",
    person_id: "person-1",
    direction: "lending",
    description: null,
    note: null,
    due_date: null,
    original_date: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLoanEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    owner_id: "user-1",
    loan_id: "loan-1",
    kind: "disbursement",
    amount: 200_000,
    event_date: "2026-07-01",
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
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

  describe("GET /financial-position", () => {
    it("reconciles account total and net worth across a period spanning a loan disbursement", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          categories: [],
          accounts: [{ id: "cash", opening_balance: 1_000_000 }],
          transactions: [
            {
              id: "salary",
              owner_id: "user-1",
              type: "income",
              amount: 300_000,
              category_id: null,
              account_id: "cash",
              to_account_id: null,
              merchant: "Salary",
              note: null,
              tx_date: "2026-07-02",
              receipt_url: null,
              subscription_id: null,
              created_at: "2026-07-02T00:00:00.000Z",
            },
            {
              id: "lend-tx",
              owner_id: "user-1",
              type: "loan",
              amount: 200_000,
              category_id: null,
              account_id: "cash",
              to_account_id: null,
              cash_flow_direction: "outflow",
              loan_event_id: "lend-event",
              merchant: "Loan",
              note: null,
              tx_date: "2026-07-04",
              receipt_url: null,
              subscription_id: null,
              created_at: "2026-07-04T00:00:00.000Z",
            },
          ],
          loans: [makeLoanRow({ id: "loan-lend", direction: "lending" })],
          loanEvents: [
            makeLoanEventRow({
              id: "lend-event",
              loan_id: "loan-lend",
              amount: 200_000,
              event_date: "2026-07-04",
            }),
          ],
        }),
      );

      const response = await makeApp().request(
        "/reports/financial-position?from=2026-07-01&to=2026-07-31",
      );
      const body = (await response.json()) as {
        data: {
          closing: Record<string, number>;
          reconciliation: { accountTotal: { matches: boolean }; netWorth: { matches: boolean } };
          income: number;
          expense: number;
          loanCashFlow: Record<string, number>;
        };
      };

      expect(body.data.closing).toEqual({
        // 1,000,000 opening + 300,000 income − 200,000 loan disbursement outflow.
        accountTotal: 1_100_000,
        lendingOutstanding: 200_000,
        borrowingOutstanding: 0,
        netWorth: 1_300_000,
      });
      expect(body.data.reconciliation.accountTotal.matches).toBe(true);
      expect(body.data.reconciliation.netWorth.matches).toBe(true);
      // Loan principal must not appear in income/expense.
      expect(body.data.income).toBe(300_000);
      expect(body.data.expense).toBe(0);
      expect(body.data.loanCashFlow).toMatchObject({ lent: 200_000, net: -200_000 });
    });

    it("rejects an inverted date range", async () => {
      getSupabase.mockReturnValue(buildClient({ categories: [], transactions: [] }));

      const response = await makeApp().request(
        "/reports/financial-position?from=2026-08-31&to=2026-07-01",
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /spending-analysis", () => {
    const categories = [
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
      {
        id: "fee",
        owner_id: null,
        name: "Transfer Fee",
        icon: "ArrowRightLeft",
        color: "chart-12",
        is_hidden: true,
        type: "expense",
        parent_id: null,
        created_at: "2020-01-01T00:00:00.000Z",
      },
    ];

    function makeTxRow(overrides: Record<string, unknown> = {}) {
      return {
        id: "tx",
        owner_id: "user-1",
        type: "expense",
        amount: 100,
        category_id: null,
        account_id: "acc-1",
        to_account_id: null,
        merchant: "Merchant",
        note: null,
        tx_date: "2026-07-10",
        receipt_url: null,
        subscription_id: null,
        created_at: "2026-07-10T00:00:00.000Z",
        ...overrides,
      };
    }

    it("excludes transfers, loans, and balance adjustments while keeping transfer-fee expenses", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          categories,
          transactions: [
            makeTxRow({ id: "food", category_id: "cat-food", amount: 1000, tx_date: "2026-07-05" }),
            makeTxRow({ id: "coffee", category_id: "cat-coffee", amount: 300, tx_date: "2026-07-06" }),
            makeTxRow({ id: "uncategorized", category_id: null, amount: 50, tx_date: "2026-07-07" }),
            makeTxRow({
              id: "transfer",
              type: "transfer",
              category_id: null,
              to_account_id: "acc-2",
              amount: 9999,
              tx_date: "2026-07-08",
            }),
            makeTxRow({
              id: "loan",
              type: "loan",
              category_id: null,
              amount: 9999,
              cash_flow_direction: "outflow",
              loan_event_id: "event-1",
              tx_date: "2026-07-08",
            }),
            makeTxRow({
              id: "adjustment",
              category_id: "cat-adjustment-expense",
              amount: 9999,
              tx_date: "2026-07-08",
            }),
            makeTxRow({ id: "fee-tx", category_id: "fee", amount: 10, tx_date: "2026-07-09" }),
          ],
        }),
      );

      const response = await makeApp().request(
        "/reports/spending-analysis?from=2026-07-01&to=2026-07-31&preset=this-month",
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: {
          totals: { current: number; previous: number; changePercentage: number | null };
          categories: { categoryId: string | null; current: number; children: unknown[] }[];
        };
      };

      expect(body.data.totals.current).toBe(1000 + 300 + 50 + 10);
      expect(body.data.totals.previous).toBe(0);
      expect(body.data.totals.changePercentage).toBeNull();

      const foodEntry = body.data.categories.find((entry) => entry.categoryId === "cat-food");
      // Parent total rolls up its children by default: 1000 direct + 300 from Coffee.
      expect(foodEntry?.current).toBe(1300);
      expect(foodEntry?.children).toEqual([
        expect.objectContaining({ categoryId: "cat-coffee", current: 300 }),
      ]);

      const uncategorizedEntry = body.data.categories.find((entry) => entry.categoryId === null);
      expect(uncategorizedEntry?.current).toBe(50);
    });

    it("computes the comparison range against the previous custom-length window", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          categories,
          transactions: [
            makeTxRow({ id: "current", category_id: "cat-food", amount: 400, tx_date: "2026-07-15" }),
            makeTxRow({ id: "previous", category_id: "cat-food", amount: 200, tx_date: "2026-07-04" }),
          ],
        }),
      );

      const response = await makeApp().request(
        "/reports/spending-analysis?from=2026-07-10&to=2026-07-19&preset=custom",
      );

      const body = (await response.json()) as {
        data: { comparisonRange: { from: string; to: string }; totals: { current: number; previous: number } };
      };

      expect(body.data.comparisonRange).toEqual({ from: "2026-06-30", to: "2026-07-09" });
      expect(body.data.totals).toMatchObject({ current: 400, previous: 200 });
    });

    it("never mixes in another user's transactions or custom categories", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          categories,
          transactions: [
            makeTxRow({ id: "mine", category_id: "cat-food", amount: 100, tx_date: "2026-07-05" }),
          ],
        }),
      );

      const response = await makeApp().request(
        "/reports/spending-analysis?from=2026-07-01&to=2026-07-31&preset=this-month",
      );

      const client = getSupabase();
      expect(response.status).toBe(200);
      expect(client.transactionsBuilder.eq).toHaveBeenCalledWith("owner_id", "user-1");
      expect(client.categoriesBuilder.or).toHaveBeenCalledWith("owner_id.eq.user-1,owner_id.is.null");
    });

    it("rejects an inverted date range", async () => {
      getSupabase.mockReturnValue(buildClient({ categories: [], transactions: [] }));

      const response = await makeApp().request(
        "/reports/spending-analysis?from=2026-08-31&to=2026-07-01&preset=custom",
      );

      expect(response.status).toBe(400);
    });

    it("rejects an unknown preset", async () => {
      getSupabase.mockReturnValue(buildClient({ categories: [], transactions: [] }));

      const response = await makeApp().request(
        "/reports/spending-analysis?from=2026-07-01&to=2026-07-31&preset=not-a-preset",
      );

      expect(response.status).toBe(400);
    });
  });
});
