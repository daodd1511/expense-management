import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv } from "../../middleware/auth";
import { errorMiddleware, handleError } from "../../middleware/error";

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  getSupabase,
}));

import { loansRouter, peopleRouter } from "./routes";

type StubResult = { data?: unknown; error?: unknown };

function createSupabaseStub(results: StubResult[]) {
  let call = 0;
  const next = () => results[call++] ?? { data: null, error: null };

  const builder: Record<string, unknown> = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    rpc: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    single: vi.fn(() => Promise.resolve(next())),
    then: (resolve: (value: StubResult) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(next()).then(resolve, reject),
  };

  return builder;
}

function buildApp() {
  const app = new Hono<AuthEnv>();
  app.use("*", errorMiddleware);
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("userId", "user-1");
    await next();
  });
  app.route("/loans", loansRouter);
  app.route("/people", peopleRouter);
  return app;
}

const personRow = {
  id: "person-1",
  owner_id: "user-1",
  name: "Alex",
  note: null,
  created_at: "2026-07-01T00:00:00.000Z",
};

const loanRow = {
  id: "loan-1",
  owner_id: "user-1",
  person_id: "person-1",
  direction: "lending",
  description: null,
  note: null,
  due_date: null,
  original_date: null,
  created_at: "2026-07-01T00:00:00.000Z",
};

const eventRow = {
  id: "event-1",
  owner_id: "user-1",
  loan_id: "loan-1",
  kind: "disbursement",
  amount: 100_000,
  event_date: "2026-07-01",
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("peopleRouter", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("lists people", async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: [personRow], error: null }]));
    const response = await buildApp().request("/people");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: "person-1", name: "Alex" }],
    });
  });

  it("creates a person", async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: personRow, error: null }]));
    const response = await buildApp().request("/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alex" }),
    });
    expect(response.status).toBe(201);
  });

  it("rejects an empty name", async () => {
    const response = await buildApp().request("/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(response.status).toBe(400);
  });

  it("404s deleting a person that doesn't exist", async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: null, error: null }]));
    const response = await buildApp().request("/people/missing", { method: "DELETE" });
    expect(response.status).toBe(404);
  });
});

describe("loansRouter", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("requires the today query param", async () => {
    const response = await buildApp().request("/loans");
    expect(response.status).toBe(400);
  });

  it("creates a disbursed loan through the RPC", async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        {
          data: {
            loan_id: loanRow.id,
            loan_owner_id: loanRow.owner_id,
            loan_person_id: loanRow.person_id,
            loan_direction: loanRow.direction,
            loan_description: loanRow.description,
            loan_note: loanRow.note,
            loan_due_date: loanRow.due_date,
            loan_original_date: loanRow.original_date,
            loan_created_at: loanRow.created_at,
            event_id: eventRow.id,
            event_owner_id: eventRow.owner_id,
            event_loan_id: eventRow.loan_id,
            event_kind: eventRow.kind,
            event_amount: eventRow.amount,
            event_event_date: eventRow.event_date,
            event_created_at: eventRow.created_at,
          },
          error: null,
        },
        { data: personRow, error: null }, // loadPerson for the response's personName
      ]),
    );

    const response = await buildApp().request("/loans/disbursed?today=2026-07-13", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: "person-1",
        direction: "lending",
        amount: 100_000,
        accountId: "acc-1",
        date: "2026-07-01",
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { data: Record<string, unknown>; error?: string };
    expect(body.data).toMatchObject({
      id: "loan-1",
      personName: "Alex",
      originAmount: 100_000,
      outstandingBalance: 100_000,
      status: "open",
    });
  });

  it("maps a repayment overpay domain error to 400", async () => {
    getSupabase.mockReturnValue(
      createSupabaseStub([
        {
          data: null,
          error: {
            code: "22023",
            message: "Repayment amount must be positive and not exceed the outstanding balance",
          },
        },
      ]),
    );

    const response = await buildApp().request("/loans/loan-1/repayments?today=2026-07-13", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 999_999, accountId: "acc-1", date: "2026-07-05" }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { data: Record<string, unknown>; error?: string };
    expect(body.error).toMatch(/outstanding balance/);
  });

  it("404s a not-found loan detail lookup", async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: null, error: null }]));
    const response = await buildApp().request("/loans/missing?today=2026-07-13");
    expect(response.status).toBe(404);
  });

  it("rejects a close request with an invalid kind", async () => {
    const response = await buildApp().request("/loans/loan-1/close?today=2026-07-13", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "cancelled", date: "2026-07-13" }),
    });
    expect(response.status).toBe(400);
  });

  it("deletes a loan", async () => {
    getSupabase.mockReturnValue(createSupabaseStub([{ data: { id: "loan-1" }, error: null }]));
    const response = await buildApp().request("/loans/loan-1", { method: "DELETE" });
    expect(response.status).toBe(200);
  });
});
