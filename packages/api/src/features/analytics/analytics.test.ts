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

import { analyticsRouter } from "./routes";

function buildClient({
  accounts,
  transactions,
  loans = [],
  loanEvents = [],
}: {
  accounts: unknown[];
  transactions: unknown[];
  loans?: unknown[];
  loanEvents?: unknown[];
}) {
  const from = vi.fn((table: string) => {
    if (table === "accounts") {
      const eqArchived = vi.fn().mockResolvedValue({ data: accounts, error: null });
      const eqOwner = vi.fn().mockReturnValue({ eq: eqArchived });
      return { select: vi.fn().mockReturnValue({ eq: eqOwner }) };
    }
    if (table === "transactions") {
      const eqOwner = vi.fn().mockResolvedValue({ data: transactions, error: null });
      return { select: vi.fn().mockReturnValue({ eq: eqOwner }) };
    }
    if (table === "loans") {
      const eqOwner = vi.fn().mockResolvedValue({ data: loans, error: null });
      return { select: vi.fn().mockReturnValue({ eq: eqOwner }) };
    }
    if (table === "loan_events") {
      const inLoanIds = vi.fn().mockResolvedValue({ data: loanEvents, error: null });
      const eqOwner = vi.fn().mockReturnValue({ in: inLoanIds });
      return { select: vi.fn().mockReturnValue({ eq: eqOwner }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from };
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
  app.route("/analytics", analyticsRouter);
  return app;
}

describe("analyticsRouter", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("computes a zero-filled 6-month balance trend ending at referenceMonth", async () => {
    getSupabase.mockReturnValue(
      buildClient({
        accounts: [
          {
            id: "acc-1",
            owner_id: "user-1",
            name: "Checking",
            kind: "bank",
            opening_balance: 1000,
            display_order: 0,
            archived: false,
            created_at: "2020-01-01T00:00:00.000Z",
          },
        ],
        transactions: [
          {
            id: "tx-1",
            owner_id: "user-1",
            type: "income",
            amount: 500,
            category_id: null,
            account_id: "acc-1",
            to_account_id: null,
            merchant: "Salary",
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
            amount: 200,
            category_id: null,
            account_id: "acc-1",
            to_account_id: null,
            merchant: "Groceries",
            note: null,
            tx_date: "2026-07-02",
            receipt_url: null,
            subscription_id: null,
            created_at: "2026-07-02T08:00:00.000Z",
          },
        ],
      }),
    );

    const response = await makeApp().request("/analytics/balance-trend?referenceMonth=2026-07");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { month: "2026-02", balance: 1000 },
        { month: "2026-03", balance: 1000 },
        { month: "2026-04", balance: 1000 },
        { month: "2026-05", balance: 1000 },
        { month: "2026-06", balance: 1000 },
        { month: "2026-07", balance: 1300 },
      ],
    });
  });

  it("excludes archived accounts and their transactions from the trend", async () => {
    getSupabase.mockReturnValue(
      buildClient({
        accounts: [
          {
            id: "acc-1",
            owner_id: "user-1",
            name: "Checking",
            kind: "bank",
            opening_balance: 500,
            display_order: 0,
            archived: false,
            created_at: "2020-01-01T00:00:00.000Z",
          },
        ],
        transactions: [
          {
            id: "tx-1",
            owner_id: "user-1",
            type: "income",
            amount: 9999,
            category_id: null,
            account_id: "acc-archived",
            to_account_id: null,
            merchant: "Old salary",
            note: null,
            tx_date: "2026-07-01",
            receipt_url: null,
            subscription_id: null,
            created_at: "2026-07-01T08:00:00.000Z",
          },
        ],
      }),
    );

    const response = await makeApp().request("/analytics/balance-trend?referenceMonth=2026-07");
    const body = (await response.json()) as { data: { month: string; balance: number }[] };

    expect(body.data.at(-1)).toEqual({ month: "2026-07", balance: 500 });
  });

  it("rejects an invalid referenceMonth", async () => {
    getSupabase.mockReturnValue(buildClient({ accounts: [], transactions: [] }));

    const response = await makeApp().request("/analytics/balance-trend?referenceMonth=not-a-month");

    expect(response.status).toBe(400);
  });

  describe("GET /dashboard-summary", () => {
    it("derives net worth and loans summary from account, transaction, and loan-event state", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          accounts: [
            {
              id: "cash",
              owner_id: "user-1",
              name: "Cash",
              kind: "cash",
              opening_balance: 1_000_000,
              display_order: 0,
              archived: false,
              created_at: "2020-01-01T00:00:00.000Z",
            },
          ],
          transactions: [
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
              tx_date: "2026-07-01",
              receipt_url: null,
              subscription_id: null,
              created_at: "2026-07-01T00:00:00.000Z",
            },
          ],
          loans: [
            makeLoanRow({ id: "loan-lend", direction: "lending", due_date: "2026-07-01" }),
            makeLoanRow({ id: "loan-borrow", direction: "borrowing", person_id: "person-2" }),
          ],
          loanEvents: [
            makeLoanEventRow({
              id: "lend-event",
              loan_id: "loan-lend",
              amount: 200_000,
              event_date: "2026-07-01",
            }),
            makeLoanEventRow({
              id: "borrow-event",
              loan_id: "loan-borrow",
              amount: 30_000,
              event_date: "2026-07-01",
            }),
          ],
        }),
      );

      const response = await makeApp().request("/analytics/dashboard-summary?today=2026-07-13");
      await expect(response.json()).resolves.toEqual({
        data: {
          netWorth: {
            // 1,000,000 opening − 200,000 loan disbursement outflow.
            accountTotal: 800_000,
            lendingOutstanding: 200_000,
            borrowingOutstanding: 30_000,
            netWorth: 970_000,
          },
          loans: {
            owedToUser: 200_000,
            userOwes: 30_000,
            netPosition: 170_000,
            // loan-lend is due 2026-07-01, before "today" 2026-07-13.
            overdueCount: 1,
          },
        },
      });
    });

    it("rejects a missing today query param", async () => {
      getSupabase.mockReturnValue(buildClient({ accounts: [], transactions: [] }));

      const response = await makeApp().request("/analytics/dashboard-summary");
      expect(response.status).toBe(400);
    });
  });

  describe("GET /net-worth-trend", () => {
    it("folds a loan event into net worth from its event month onward", async () => {
      getSupabase.mockReturnValue(
        buildClient({
          accounts: [
            {
              id: "cash",
              owner_id: "user-1",
              name: "Cash",
              kind: "cash",
              opening_balance: 1_000_000,
              display_order: 0,
              archived: false,
              created_at: "2020-01-01T00:00:00.000Z",
            },
          ],
          transactions: [],
          loans: [makeLoanRow({ id: "loan-lend", direction: "lending" })],
          loanEvents: [
            makeLoanEventRow({ loan_id: "loan-lend", amount: 200_000, event_date: "2026-06-10" }),
          ],
        }),
      );

      const response = await makeApp().request(
        "/analytics/net-worth-trend?referenceMonth=2026-07",
      );
      const body = (await response.json()) as {
        data: { month: string; netWorth: number; accountTotal: number }[];
      };
      const june = body.data.find((point) => point.month === "2026-06");
      const may = body.data.find((point) => point.month === "2026-05");

      expect(may).toEqual({
        month: "2026-05",
        netWorth: 1_000_000,
        accountTotal: 1_000_000,
        lendingOutstanding: 0,
        borrowingOutstanding: 0,
      });
      expect(june).toEqual({
        month: "2026-06",
        netWorth: 1_200_000,
        accountTotal: 1_000_000,
        lendingOutstanding: 200_000,
        borrowingOutstanding: 0,
      });
    });
  });
});
