import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import {
  USER_A,
  USER_B,
  createTestAccount,
  createTestCategory,
  jsonRequest,
  withApiTestDatabase,
  type ApiTestContext,
} from "../../test/postgres-fixture";

vi.setConfig({ testTimeout: 30_000 });

async function createTransaction(
  context: ApiTestContext,
  userId: string,
  input: Record<string, unknown>,
) {
  const response = await context.request(userId, "/api/transactions", jsonRequest("POST", input));
  expect(response.status).toBe(201);
}

describe.skipIf(!hasTestDatabase)("reports API with PostgreSQL", () => {
  it("reports monthly income and expense while excluding transfers", async () => {
    await withApiTestDatabase(async (context) => {
      const cash = await createTestAccount(context, USER_A, "Cash");
      const bank = await createTestAccount(context, USER_A, "Bank");
      const expense = await createTestCategory(context, USER_A, { name: "Food" });
      const income = await createTestCategory(context, USER_A, {
        name: "Salary",
        type: "income",
      });
      await createTransaction(context, USER_A, {
        type: "income",
        amount: 1_000,
        categoryId: income.id,
        accountId: cash.id,
        merchant: "Salary",
        date: "2026-07-01",
      });
      await createTransaction(context, USER_A, {
        type: "expense",
        amount: 250,
        categoryId: expense.id,
        accountId: cash.id,
        merchant: "Food",
        date: "2026-07-02",
      });
      await createTransaction(context, USER_A, {
        type: "transfer",
        amount: 300,
        categoryId: null,
        accountId: cash.id,
        toAccountId: bank.id,
        merchant: "Move",
        date: "2026-07-03",
      });

      const response = await context.request(
        USER_A,
        "/api/reports/income-expense?from=2026-07-01&to=2026-07-31",
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        data: {
          totals: { income: 1_000, expense: 250, net: 750, transactionCount: 2 },
        },
      });
    });
  });

  it("reconciles account total and isolates another User's financial rows", async () => {
    await withApiTestDatabase(async (context) => {
      const own = await createTestAccount(context, USER_A, "Own");
      const other = await createTestAccount(context, USER_B, "Other");
      await createTransaction(context, USER_A, {
        type: "income",
        amount: 500,
        categoryId: null,
        accountId: own.id,
        merchant: "Own",
        date: "2026-07-01",
      });
      await createTransaction(context, USER_B, {
        type: "income",
        amount: 9_999,
        categoryId: null,
        accountId: other.id,
        merchant: "Private",
        date: "2026-07-01",
      });

      const response = await context.request(
        USER_A,
        "/api/reports/financial-position?from=2026-07-01&to=2026-07-31",
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        data: { closing: { accountTotal: 1_500, netWorth: 1_500 } },
      });
    });
  });

  it("keeps transfer-fee expenses while excluding transfers from spending analysis", async () => {
    await withApiTestDatabase(async (context) => {
      const cash = await createTestAccount(context, USER_A, "Cash");
      const bank = await createTestAccount(context, USER_A, "Bank");
      await createTransaction(context, USER_A, {
        type: "transfer",
        amount: 300,
        fee: 25,
        categoryId: null,
        accountId: cash.id,
        toAccountId: bank.id,
        merchant: "Move",
        date: "2026-07-03",
      });

      const response = await context.request(
        USER_A,
        "/api/reports/spending-analysis?from=2026-07-01&to=2026-07-31&preset=custom",
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        data: { totals: { current: 25 } },
      });
    });
  });

  it("rejects inverted ranges and unknown presets", async () => {
    await withApiTestDatabase(async (context) => {
      expect(
        (await context.request(USER_A, "/api/reports/income-expense?from=2026-08-01&to=2026-07-01"))
          .status,
      ).toBe(400);
      expect(
        (
          await context.request(
            USER_A,
            "/api/reports/spending-analysis?from=2026-07-01&to=2026-07-31&preset=unknown",
          )
        ).status,
      ).toBe(400);
    });
  });
});
