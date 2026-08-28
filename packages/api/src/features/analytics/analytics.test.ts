import type { Account, Loan, LoanEvent, Transaction } from "@wallet/shared";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import type { AuthEnv } from "../../middleware/auth";
import { handleError } from "../../middleware/error";
import {
  DUMMY_DB,
  USER_A,
  USER_B,
  createTestAccount,
  jsonRequest,
  withApiTestDatabase,
} from "../../test/postgres-fixture";
import * as repository from "./repository";
import { analyticsRouter } from "./routes";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "cash",
    name: "Cash",
    kind: "cash",
    openingBalance: 1_000_000,
    displayOrder: 0,
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    type: "income",
    amount: 500,
    categoryId: null,
    accountId: "cash",
    toAccountId: null,
    merchant: "Salary",
    date: "2026-07-01",
    ...overrides,
  };
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    personId: "person-1",
    direction: "lending",
    description: undefined,
    note: undefined,
    dueDate: undefined,
    originalDate: undefined,
    ...overrides,
  };
}

function event(overrides: Partial<LoanEvent> = {}): LoanEvent {
  return {
    id: "event-1",
    loanId: "loan-1",
    kind: "disbursement",
    amount: 200_000,
    date: "2026-07-01",
    ...overrides,
  };
}

function mockData(input: {
  accounts?: Account[];
  transactions?: Transaction[];
  loansWithEvents?: { loan: Loan; events: LoanEvent[] }[];
}) {
  vi.spyOn(repository, "listActiveAccounts").mockResolvedValue(input.accounts ?? []);
  vi.spyOn(repository, "listTransactions").mockResolvedValue(input.transactions ?? []);
  vi.spyOn(repository, "listLoansWithEvents").mockResolvedValue(input.loansWithEvents ?? []);
}

function makeApp() {
  const app = new Hono<AuthEnv>();
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("userId", USER_A);
    c.set("db", DUMMY_DB);
    await next();
  });
  app.route("/analytics", analyticsRouter);
  return app;
}

describe("analyticsRouter", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("computes a zero-filled 6-month balance trend ending at referenceMonth", async () => {
    mockData({
      accounts: [account({ openingBalance: 1_000 })],
      transactions: [transaction(), transaction({ id: "expense", type: "expense", amount: 200 })],
    });

    const response = await makeApp().request("/analytics/balance-trend?referenceMonth=2026-07");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { month: "2026-02", balance: 1_000 },
        { month: "2026-03", balance: 1_000 },
        { month: "2026-04", balance: 1_000 },
        { month: "2026-05", balance: 1_000 },
        { month: "2026-06", balance: 1_000 },
        { month: "2026-07", balance: 1_300 },
      ],
    });
  });

  it("excludes transactions whose accounts are not active", async () => {
    mockData({
      accounts: [account({ id: "active", openingBalance: 500 })],
      transactions: [transaction({ accountId: "archived", amount: 9_999 })],
    });

    const response = await makeApp().request("/analytics/balance-trend?referenceMonth=2026-07");
    const body = (await response.json()) as { data: { month: string; balance: number }[] };
    expect(body.data.at(-1)).toEqual({ month: "2026-07", balance: 500 });
  });

  it("rejects invalid or missing date query parameters", async () => {
    mockData({});
    expect(
      (await makeApp().request("/analytics/balance-trend?referenceMonth=not-a-month")).status,
    ).toBe(400);
    expect((await makeApp().request("/analytics/dashboard-summary")).status).toBe(400);
  });

  it("derives dashboard net worth and loan summary", async () => {
    mockData({
      accounts: [account()],
      transactions: [
        transaction({
          id: "lend-tx",
          type: "loan",
          amount: 200_000,
          cashFlowDirection: "outflow",
          loanEventId: "lend-event",
        }),
      ],
      loansWithEvents: [
        {
          loan: loan({ id: "loan-lend", dueDate: "2026-07-01" }),
          events: [event({ id: "lend-event", loanId: "loan-lend" })],
        },
        {
          loan: loan({ id: "loan-borrow", personId: "person-2", direction: "borrowing" }),
          events: [event({ id: "borrow-event", loanId: "loan-borrow", amount: 30_000 })],
        },
      ],
    });

    const response = await makeApp().request("/analytics/dashboard-summary?today=2026-07-13");
    await expect(response.json()).resolves.toEqual({
      data: {
        netWorth: {
          accountTotal: 800_000,
          lendingOutstanding: 200_000,
          borrowingOutstanding: 30_000,
          netWorth: 970_000,
        },
        loans: {
          owedToUser: 200_000,
          userOwes: 30_000,
          netPosition: 170_000,
          overdueCount: 1,
        },
      },
    });
  });

  it("folds a loan event into net worth from its event month onward", async () => {
    mockData({
      accounts: [account()],
      loansWithEvents: [
        {
          loan: loan({ id: "loan-lend" }),
          events: [event({ loanId: "loan-lend", date: "2026-06-10" })],
        },
      ],
    });

    const response = await makeApp().request("/analytics/net-worth-trend?referenceMonth=2026-07");
    const body = (await response.json()) as { data: { month: string; netWorth: number }[] };
    expect(body.data.find((point) => point.month === "2026-05")?.netWorth).toBe(1_000_000);
    expect(body.data.find((point) => point.month === "2026-06")?.netWorth).toBe(1_200_000);
  });
});

describe.skipIf(!hasTestDatabase)("analytics PostgreSQL isolation", () => {
  vi.setConfig({ testTimeout: 30_000 });
  beforeEach(() => vi.restoreAllMocks());

  it("never includes another User's accounts or transactions", async () => {
    await withApiTestDatabase(async (context) => {
      const own = await createTestAccount(context, USER_A, "Own");
      const other = await createTestAccount(context, USER_B, "Other");
      await context.request(
        USER_A,
        "/api/transactions",
        jsonRequest("POST", {
          type: "income",
          amount: 100,
          categoryId: null,
          accountId: own.id,
          merchant: "Own income",
          date: "2026-07-01",
        }),
      );
      await context.request(
        USER_B,
        "/api/transactions",
        jsonRequest("POST", {
          type: "income",
          amount: 9_999,
          categoryId: null,
          accountId: other.id,
          merchant: "Private income",
          date: "2026-07-01",
        }),
      );

      const response = await context.request(
        USER_A,
        "/api/analytics/balance-trend?referenceMonth=2026-07",
      );
      const body = (await response.json()) as { data: { balance: number }[] };
      expect(body.data.at(-1)?.balance).toBe(1_100);
    });
  });
});
