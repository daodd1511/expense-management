import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import {
  USER_A,
  USER_B,
  createTestAccount,
  jsonRequest,
  readJson,
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
  const body = await readJson<{ data: { id: string } }>(response);
  return body.data;
}

describe.skipIf(!hasTestDatabase)("transactions API with PostgreSQL", () => {
  it("returns deterministic newest-first balances with prior-month history", async () => {
    await withApiTestDatabase(async (context) => {
      const cash = await createTestAccount(context, USER_A, "Cash");
      await createTransaction(context, USER_A, {
        type: "income",
        amount: 500,
        categoryId: null,
        accountId: cash.id,
        merchant: "June salary",
        date: "2026-06-30",
        time: "18:00",
      });
      const first = await createTransaction(context, USER_A, {
        type: "expense",
        amount: 100,
        categoryId: null,
        accountId: cash.id,
        merchant: "Early",
        date: "2026-07-02",
        time: "09:00",
      });
      const second = await createTransaction(context, USER_A, {
        type: "expense",
        amount: 50,
        categoryId: null,
        accountId: cash.id,
        merchant: "Late",
        date: "2026-07-02",
        time: "18:00",
      });

      const response = await context.request(USER_A, "/api/transactions?month=2026-07");
      const body = (await response.json()) as {
        data: { id: string; balanceAfter: number }[];
      };
      expect(body.data).toEqual([
        expect.objectContaining({ id: second.id, balanceAfter: 1_350 }),
        expect.objectContaining({ id: first.id, balanceAfter: 1_400 }),
      ]);
    });
  });

  it("rejects future dates and generic loan creation", async () => {
    await withApiTestDatabase(async (context) => {
      const account = await createTestAccount(context, USER_A, "Cash");
      const future = await context.request(
        USER_A,
        "/api/transactions",
        jsonRequest(
          "POST",
          {
            type: "expense",
            amount: 100,
            categoryId: null,
            accountId: account.id,
            merchant: "Future",
            date: "2999-01-01",
          },
          { "X-Client-Timezone": "UTC" },
        ),
      );
      expect(future.status).toBe(400);

      const loan = await context.request(
        USER_A,
        "/api/transactions",
        jsonRequest("POST", {
          type: "loan",
          amount: 100,
          categoryId: null,
          accountId: account.id,
          merchant: "Loan",
          date: "2026-07-01",
          cashFlowDirection: "outflow",
          loanEventId: "00000000-0000-0000-0000-000000000000",
        }),
      );
      expect(loan.status).toBe(400);
    });
  });

  it("prevents cross-User update and delete without revealing the row", async () => {
    await withApiTestDatabase(async (context) => {
      const account = await createTestAccount(context, USER_B, "Private");
      const transaction = await createTransaction(context, USER_B, {
        type: "income",
        amount: 500,
        categoryId: null,
        accountId: account.id,
        merchant: "Private",
        date: "2026-07-01",
      });

      expect(
        (
          await context.request(
            USER_A,
            `/api/transactions/${transaction.id}`,
            jsonRequest("PATCH", { amount: 999 }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await context.request(USER_A, `/api/transactions/${transaction.id}`, {
            method: "DELETE",
          })
        ).status,
      ).toBe(404);
      await expect((await context.request(USER_A, "/api/transactions")).json()).resolves.toEqual({
        data: [],
      });
    });
  });

  it("rejects generic mutation of loan-linked transactions", async () => {
    await withApiTestDatabase(async (context) => {
      const account = await createTestAccount(context, USER_A, "Cash");
      const personResponse = await context.request(
        USER_A,
        "/api/people",
        jsonRequest("POST", { name: "Alex" }),
      );
      const person = (await readJson<{ data: { id: string } }>(personResponse)).data;
      const loanResponse = await context.request(
        USER_A,
        "/api/loans/disbursed?today=2026-07-10",
        jsonRequest("POST", {
          personId: person.id,
          direction: "lending",
          amount: 500,
          accountId: account.id,
          date: "2026-07-01",
        }),
      );
      expect(loanResponse.status).toBe(201);
      const list = await context.request(USER_A, "/api/transactions");
      const body = (await list.json()) as { data: { id: string; type: string }[] };
      const loanTransaction = body.data.find((transaction) => transaction.type === "loan");
      if (!loanTransaction) throw new Error("loan-linked transaction missing");

      expect(
        (
          await context.request(
            USER_A,
            `/api/transactions/${loanTransaction.id}`,
            jsonRequest("PATCH", { amount: 400 }),
          )
        ).status,
      ).toBe(409);
      expect(
        (
          await context.request(USER_A, "/api/transactions", {
            ...jsonRequest("DELETE", { ids: [loanTransaction.id] }),
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await context.request(USER_A, `/api/transactions/${loanTransaction.id}`, {
            method: "DELETE",
          })
        ).status,
      ).toBe(409);
    });
  });

  it("creates transfer fees atomically and rejects cross-User account identifiers", async () => {
    await withApiTestDatabase(async (context) => {
      const cash = await createTestAccount(context, USER_A, "Cash");
      const bank = await createTestAccount(context, USER_A, "Bank");
      const privateAccount = await createTestAccount(context, USER_B, "Private");
      const created = await context.request(
        USER_A,
        "/api/transactions",
        jsonRequest("POST", {
          type: "transfer",
          amount: 300,
          fee: 25,
          categoryId: null,
          accountId: cash.id,
          toAccountId: bank.id,
          merchant: "Move",
          date: "2026-07-01",
        }),
      );
      expect(created.status).toBe(201);
      const beforeRejected = await context.request(USER_A, "/api/transactions");
      const beforeBody = (await beforeRejected.json()) as { data: unknown[] };
      expect(beforeBody.data).toHaveLength(2);

      const rejected = await context.request(
        USER_A,
        "/api/transactions",
        jsonRequest("POST", {
          type: "transfer",
          amount: 100,
          fee: 10,
          categoryId: null,
          accountId: cash.id,
          toAccountId: privateAccount.id,
          merchant: "Leak",
          date: "2026-07-02",
        }),
      );
      expect(rejected.status).toBe(404);

      const afterRejected = await context.request(USER_A, "/api/transactions");
      const afterBody = (await afterRejected.json()) as { data: unknown[] };
      expect(afterBody.data).toHaveLength(2);
    });
  });
});
