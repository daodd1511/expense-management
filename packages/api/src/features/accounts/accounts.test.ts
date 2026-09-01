import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import { USER_A, USER_B, readJson, withApiTestDatabase } from "../../test/postgres-fixture";

vi.setConfig({ testTimeout: 30_000 });

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function createAccount(
  request: Parameters<Parameters<typeof withApiTestDatabase>[0]>[0]["request"],
  userId: string,
  name: string,
) {
  const response = await request(
    userId,
    "/api/accounts",
    json("POST", { name, kind: "bank", openingBalance: 1_000 }),
  );
  expect(response.status).toBe(201);
  const body = await readJson<{ data: { id: string; displayOrder: number } }>(response);
  return body.data;
}

describe.skipIf(!hasTestDatabase)("accounts API with PostgreSQL", () => {
  it("returns mapped balances and scopes reads to the authenticated User", async () => {
    await withApiTestDatabase(async ({ request }) => {
      const accountA = await createAccount(request, USER_A, "A bank");
      await createAccount(request, USER_B, "B bank");
      const transaction = await request(
        USER_A,
        "/api/transactions",
        json("POST", {
          type: "income",
          amount: 500,
          categoryId: null,
          accountId: accountA.id,
          merchant: "Payroll",
          date: "2026-07-01",
        }),
      );
      expect(transaction.status).toBe(201);

      const response = await request(USER_A, "/api/accounts");

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        data: [
          expect.objectContaining({
            id: accountA.id,
            name: "A bank",
            openingBalance: 1_000,
            balance: 1_500,
          }),
        ],
      });
    });
  });

  it("assigns append order and reorders the complete active set atomically", async () => {
    await withApiTestDatabase(async ({ request }) => {
      const first = await createAccount(request, USER_A, "First");
      const second = await createAccount(request, USER_A, "Second");
      expect([first.displayOrder, second.displayOrder]).toEqual([0, 1]);

      const reordered = await request(
        USER_A,
        "/api/accounts/order",
        json("PUT", { accountIds: [second.id, first.id] }),
      );
      expect(reordered.status).toBe(200);

      const invalid = await request(
        USER_A,
        "/api/accounts/order",
        json("PUT", { accountIds: [second.id, second.id] }),
      );
      expect(invalid.status).toBe(400);

      const response = await request(USER_A, "/api/accounts");
      const body = (await response.json()) as { data: { id: string }[] };
      expect(body.data.map((account) => account.id)).toEqual([second.id, first.id]);
    });
  });

  it("cannot update or archive another User's Account", async () => {
    await withApiTestDatabase(async ({ request }) => {
      const account = await createAccount(request, USER_B, "Private");

      const update = await request(
        USER_A,
        `/api/accounts/${account.id}`,
        json("PATCH", { name: "Changed" }),
      );
      expect(update.status).toBe(404);

      const archive = await request(USER_A, `/api/accounts/${account.id}`, { method: "DELETE" });
      expect(archive.status).toBe(404);

      const ownerView = await request(USER_B, "/api/accounts");
      await expect(ownerView.json()).resolves.toEqual({
        data: [expect.objectContaining({ id: account.id, name: "Private" })],
      });
    });
  });
});
