import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import {
  USER_A,
  USER_B,
  createTestAccount,
  jsonRequest,
  readJson,
  withApiTestDatabase,
} from "../../test/postgres-fixture";

vi.setConfig({ testTimeout: 30_000 });

describe.skipIf(!hasTestDatabase)("subscriptions API with PostgreSQL", () => {
  it("logs a Subscription and advances its due date in one atomic function call", async () => {
    await withApiTestDatabase(async (context) => {
      const account = await createTestAccount(context, USER_A, "Cash");
      const created = await context.request(
        USER_A,
        "/api/subscriptions",
        jsonRequest("POST", {
          name: "Rent",
          amount: 500,
          type: "expense",
          categoryId: null,
          accountId: account.id,
          cadence: "monthly",
          dayOfMonth: 5,
          monthOfYear: 1,
          today: "2026-07-01",
          active: true,
        }),
      );
      expect(created.status).toBe(201);
      const subscription = (await readJson<{ data: { id: string; nextDueDate: string } }>(created))
        .data;
      expect(subscription.nextDueDate).toBe("2026-07-05");

      const logged = await context.request(
        USER_A,
        `/api/subscriptions/${subscription.id}/log`,
        jsonRequest("POST", { today: "2026-07-05" }),
      );
      expect(logged.status).toBe(200);
      await expect(logged.json()).resolves.toMatchObject({
        data: { id: subscription.id, nextDueDate: "2026-08-05" },
      });

      const transactions = await context.request(USER_A, "/api/transactions");
      await expect(transactions.json()).resolves.toMatchObject({
        data: [expect.objectContaining({ subscriptionId: subscription.id, amount: 500 })],
      });
    });
  });

  it("rejects another User's account identifier without creating a Subscription", async () => {
    await withApiTestDatabase(async (context) => {
      const privateAccount = await createTestAccount(context, USER_B, "Private");
      const response = await context.request(
        USER_A,
        "/api/subscriptions",
        jsonRequest("POST", {
          name: "Leak",
          amount: 500,
          type: "expense",
          categoryId: null,
          accountId: privateAccount.id,
          cadence: "monthly",
          dayOfMonth: 5,
          monthOfYear: 1,
          today: "2026-07-01",
          active: true,
        }),
      );
      expect(response.status).toBe(404);
      await expect((await context.request(USER_A, "/api/subscriptions")).json()).resolves.toEqual({
        data: [],
      });
    });
  });
});
