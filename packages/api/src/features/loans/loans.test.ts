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

async function createPerson(context: ApiTestContext, userId = USER_A) {
  const response = await context.request(
    userId,
    "/api/people",
    jsonRequest("POST", { name: "Alex", note: "Friend" }),
  );
  expect(response.status).toBe(201);
  const body = await readJson<{ data: { id: string } }>(response);
  return body.data;
}

describe.skipIf(!hasTestDatabase)("loans API with PostgreSQL", () => {
  it("lists and creates People while validating missing rows and input", async () => {
    await withApiTestDatabase(async (context) => {
      const person = await createPerson(context);
      const list = await context.request(USER_A, "/api/people");
      await expect(list.json()).resolves.toEqual({
        data: [{ id: person.id, name: "Alex", note: "Friend" }],
      });

      expect(
        (await context.request(USER_A, "/api/people", jsonRequest("POST", { name: "" }))).status,
      ).toBe(400);
      expect(
        (
          await context.request(USER_A, "/api/people/00000000-0000-0000-0000-000000000000", {
            method: "DELETE",
          })
        ).status,
      ).toBe(404);
    });
  });

  it("executes disbursement, repayment, update, close, reopen, and delete atomically", async () => {
    await withApiTestDatabase(async (context) => {
      const person = await createPerson(context);
      const account = await createTestAccount(context, USER_A, "Cash");
      const created = await context.request(
        USER_A,
        "/api/loans/disbursed?today=2026-07-10",
        jsonRequest("POST", {
          personId: person.id,
          direction: "lending",
          amount: 1_000,
          accountId: account.id,
          date: "2026-07-01",
        }),
      );
      expect(created.status).toBe(201);
      const loan = (
        await readJson<{
          data: { id: string; events: { id: string; kind: string; amount: number }[] };
        }>(created)
      ).data;

      const disbursement = await context.request(
        USER_A,
        `/api/loans/${loan.id}/disbursement?today=2026-07-10`,
        jsonRequest("PATCH", { amount: 1_200, accountId: account.id, date: "2026-07-02" }),
      );
      expect(disbursement.status).toBe(200);

      const repayment = await context.request(
        USER_A,
        `/api/loans/${loan.id}/repayments?today=2026-07-10`,
        jsonRequest("POST", { amount: 200, accountId: account.id, date: "2026-07-03" }),
      );
      expect(repayment.status).toBe(201);
      const repaymentBody = (
        await readJson<{ data: { events: { id: string; kind: string }[] } }>(repayment)
      ).data;
      const repaymentEvent = repaymentBody.events.find((event) => event.kind === "repayment");
      if (!repaymentEvent) throw new Error("repayment event missing from response");

      const repaymentUpdate = await context.request(
        USER_A,
        `/api/loans/${loan.id}/repayments/${repaymentEvent.id}?today=2026-07-10`,
        jsonRequest("PATCH", { amount: 250, accountId: account.id, date: "2026-07-04" }),
      );
      expect(repaymentUpdate.status).toBe(200);

      const overpay = await context.request(
        USER_A,
        `/api/loans/${loan.id}/repayments?today=2026-07-10`,
        jsonRequest("POST", { amount: 2_000, accountId: account.id, date: "2026-07-05" }),
      );
      expect(overpay.status).toBe(400);

      const closed = await context.request(
        USER_A,
        `/api/loans/${loan.id}/close?today=2026-07-10`,
        jsonRequest("POST", { kind: "write_off", date: "2026-07-06" }),
      );
      expect(closed.status).toBe(200);
      const reopened = await context.request(
        USER_A,
        `/api/loans/${loan.id}/reopen?today=2026-07-10`,
        { method: "POST" },
      );
      expect(reopened.status).toBe(200);

      const links = await context.request(USER_A, "/api/loans/event-links");
      const linksBody = (await links.json()) as { data: { eventId: string }[] };
      expect(linksBody.data.some((link) => link.eventId === repaymentEvent.id)).toBe(true);

      expect(
        (
          await context.request(USER_A, `/api/loans/${loan.id}/repayments/${repaymentEvent.id}`, {
            method: "DELETE",
          })
        ).status,
      ).toBe(200);
      expect(
        (await context.request(USER_A, `/api/loans/${loan.id}`, { method: "DELETE" })).status,
      ).toBe(200);
    });
  });

  it("creates opening loans and rejects cross-User account identifiers without mutation", async () => {
    await withApiTestDatabase(async (context) => {
      const person = await createPerson(context);
      const opening = await context.request(
        USER_A,
        "/api/loans/opening?today=2026-07-10",
        jsonRequest("POST", {
          personId: person.id,
          direction: "borrowing",
          amount: 500,
          balanceAsOf: "2026-07-01",
        }),
      );
      expect(opening.status).toBe(201);

      const otherAccount = await createTestAccount(context, USER_B, "Private");
      const rejected = await context.request(
        USER_A,
        "/api/loans/disbursed?today=2026-07-10",
        jsonRequest("POST", {
          personId: person.id,
          direction: "lending",
          amount: 1_000,
          accountId: otherAccount.id,
          date: "2026-07-01",
        }),
      );
      expect(rejected.status).toBe(404);

      const summaries = await context.request(USER_A, "/api/loans?today=2026-07-10");
      const body = (await summaries.json()) as { data: unknown[] };
      expect(body.data).toHaveLength(1);
    });
  });

  it("requires today and validates close kind", async () => {
    await withApiTestDatabase(async (context) => {
      expect((await context.request(USER_A, "/api/loans")).status).toBe(400);
      expect(
        (
          await context.request(
            USER_A,
            "/api/loans/00000000-0000-0000-0000-000000000000/close?today=2026-07-10",
            jsonRequest("POST", { kind: "cancelled", date: "2026-07-01" }),
          )
        ).status,
      ).toBe(400);
    });
  });
});
