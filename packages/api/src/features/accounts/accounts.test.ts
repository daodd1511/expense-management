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

import { accountsRouter } from "./routes";
import * as repository from "./repository";

function buildAccountsSelectResult(accountData: unknown[], transactionData: unknown[] = []) {
  const idOrder = vi.fn().mockResolvedValue({ data: accountData, error: null });
  const createdAtOrder = vi.fn().mockReturnValue({ order: idOrder });
  const displayOrder = vi.fn().mockReturnValue({ order: createdAtOrder });
  const secondEq = vi.fn().mockReturnValue({ order: displayOrder });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const accountSelect = vi.fn().mockReturnValue({ eq: firstEq });

  const transactionEq = vi.fn().mockResolvedValue({ data: transactionData, error: null });
  const transactionSelect = vi.fn().mockReturnValue({ eq: transactionEq });
  const from = vi.fn((table: string) => {
    if (table === "accounts") return { select: accountSelect };
    if (table === "transactions") return { select: transactionSelect };
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    client: {
      from,
    },
    accountOwnerEq: firstEq,
    transactionOwnerEq: transactionEq,
    displayOrder,
    createdAtOrder,
    idOrder,
  };
}

function buildAccountCreateResult(accountData: unknown) {
  const single = vi.fn().mockResolvedValue({ data: accountData, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from }, insert };
}

function buildReorderResult(error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  const from = vi.fn();
  return { client: { rpc, from }, rpc, from };
}

function buildAccountMutationClient(method: "update" | "archive") {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const ownerEq = vi.fn().mockReturnValue({ select });
  const idEq = vi.fn().mockReturnValue({ eq: ownerEq });
  const mutation = vi.fn().mockReturnValue({ eq: idEq });
  const from = vi.fn().mockReturnValue(
    method === "update"
      ? { update: mutation }
      : { update: vi.fn().mockReturnValue({ eq: idEq }) },
  );

  return { client: { from }, idEq, ownerEq };
}

function buildApp() {
  const app = new Hono<AuthEnv>();
  app.use("*", errorMiddleware);
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("userId", "user-1");
    await next();
  });
  app.route("/accounts", accountsRouter);
  return app;
}

describe("accountsRouter", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("returns mapped account data for the authenticated user", async () => {
    const { client } = buildAccountsSelectResult(
      [
        {
          id: "acc-1",
          owner_id: "user-1",
          name: "Cash",
          kind: "cash",
          opening_balance: 1000,
          display_order: 0,
          archived: false,
          created_at: "2026-07-01T00:00:00.000Z",
        },
      ],
      [
        {
          id: "tx-1",
          owner_id: "user-1",
          type: "income",
          amount: 500,
          category_id: null,
          account_id: "acc-1",
          to_account_id: null,
          merchant: "Payroll",
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
          category_id: "cat-1",
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
    );
    getSupabase.mockReturnValue(client);

    const response = await buildApp().request("/accounts");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "acc-1",
          name: "Cash",
          kind: "cash",
          openingBalance: 1000,
          displayOrder: 0,
          balance: 1300,
        },
      ],
    });
  });

  it("scopes Account reads to the authenticated User", async () => {
    const {
      client,
      accountOwnerEq,
      transactionOwnerEq,
      displayOrder,
      createdAtOrder,
      idOrder,
    } = buildAccountsSelectResult([], []);
    getSupabase.mockReturnValue(client);

    const response = await buildApp().request("/accounts");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
    expect(accountOwnerEq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(transactionOwnerEq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(displayOrder).toHaveBeenCalledWith("display_order", { ascending: true });
    expect(createdAtOrder).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(idOrder).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("leaves append order assignment to persistence when creating an Account", async () => {
    const { client, insert } = buildAccountCreateResult({
      id: "acc-2",
      owner_id: "user-1",
      name: "Bank",
      kind: "bank",
      opening_balance: 500,
      display_order: 1,
      archived: false,
      created_at: "2026-07-02T00:00:00.000Z",
    });
    getSupabase.mockReturnValue(client);

    const response = await buildApp().request("/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bank", kind: "bank", openingBalance: 500 }),
    });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      owner_id: "user-1",
      name: "Bank",
      kind: "bank",
      opening_balance: 500,
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "acc-2",
        name: "Bank",
        kind: "bank",
        openingBalance: 500,
        displayOrder: 1,
      },
    });
  });

  it("reorders the authenticated User's complete active Account set atomically", async () => {
    const { client, rpc, from } = buildReorderResult();
    getSupabase.mockReturnValue(client);

    const response = await buildApp().request("/accounts/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountIds: ["acc-2", "acc-1"] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("reorder_accounts", {
      p_owner_id: "user-1",
      p_account_ids: ["acc-2", "acc-1"],
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ["incomplete", ["acc-1"]],
    ["duplicate", ["acc-1", "acc-1"]],
    ["foreign", ["acc-1", "user-2-account"]],
    ["archived", ["acc-1", "archived-account"]],
  ])("rejects a %s Account order without partial table updates", async (_case, accountIds) => {
    const databaseError = {
      code: "22023",
      message: "Account order must contain every active Account exactly once",
    };
    const { client, rpc, from } = buildReorderResult(databaseError);
    getSupabase.mockReturnValue(client);

    const response = await buildApp().request("/accounts/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountIds }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: databaseError.message });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("cannot update another User's Account", async () => {
    const { client, idEq, ownerEq } = buildAccountMutationClient("update");
    getSupabase.mockReturnValue(client);

    await expect(
      repository.updateAccount("user-1", "user-2-account", { name: "Changed" }),
    ).resolves.toBeNull();
    expect(idEq).toHaveBeenCalledWith("id", "user-2-account");
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-1");
  });

  it("cannot archive another User's Account", async () => {
    const { client, idEq, ownerEq } = buildAccountMutationClient("archive");
    getSupabase.mockReturnValue(client);

    await expect(repository.archiveAccount("user-1", "user-2-account")).resolves.toBe(false);
    expect(idEq).toHaveBeenCalledWith("id", "user-2-account");
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-1");
  });
});
