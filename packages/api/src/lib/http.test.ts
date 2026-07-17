import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { accountCreateSchema } from "@wallet/shared";
import { logger } from "../middleware/logger";
import { handleError } from "../middleware/error";
import { parseJsonBody } from "./response";

describe("parseJsonBody", () => {
  it("returns a 400 response for invalid JSON", async () => {
    const app = new Hono();

    app.post("/", async (c) => {
      const parsed = await parseJsonBody(c, accountCreateSchema);
      return parsed.success ? c.json(parsed.data) : parsed.response;
    });

    const response = await app.request("/", {
      method: "POST",
      body: "{",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });

  it("returns validation details for invalid request bodies", async () => {
    const app = new Hono();

    app.post("/", async (c) => {
      const parsed = await parseJsonBody(c, accountCreateSchema);
      return parsed.success ? c.json(parsed.data) : parsed.response;
    });

    const response = await app.request("/", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid request body",
      details: {
        fieldErrors: {
          kind: expect.any(Array),
          name: expect.any(Array),
          openingBalance: expect.any(Array),
        },
      },
    });
  });
});

describe("handleError", () => {
  function respond(error: { code: string; message: string }) {
    const app = new Hono();
    app.post("/", (c) => handleError(error, c));
    return app.request("/", { method: "POST" });
  }

  it("maps a unique constraint violation (23505) to 409 with a clean message", async () => {
    const response = await respond({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "category_favorites_user_id_category_id_key"',
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "This item already exists" });
  });

  it("maps a foreign key violation (23503) to 409 with a clean message", async () => {
    const response = await respond({
      code: "23503",
      message: 'insert or update on table "budgets" violates foreign key constraint',
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This action conflicts with related data",
    });
  });

  it("maps an unrecognized error code to a generic 500, without leaking the raw message", async () => {
    const response = await respond({
      code: "57P01",
      message: "terminating connection due to administrator command",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });

  it("logs the full error server-side for unrecognized codes", async () => {
    const spy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    const error = { code: "57P01", message: "terminating connection due to administrator command" };

    await respond(error);

    expect(spy).toHaveBeenCalledWith({ err: error }, "database unexpected error");
    spy.mockRestore();
  });
});
