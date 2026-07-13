import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/core/supabase", () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}));

import { ApiError, apiFetch } from "./api";

describe("apiFetch", () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.unstubAllGlobals();
  });

  it("throws when there is no auth session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    await expect(apiFetch("/transactions")).rejects.toThrow("Missing auth session");
  });

  it("sends authorization and JSON headers for requests with a body", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/transactions", {
      method: "POST",
      body: JSON.stringify({ amount: 1 }),
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/transactions", {
      method: "POST",
      body: JSON.stringify({ amount: 1 }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      },
    });
  });

  it("surfaces API JSON errors when present", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/transactions")).rejects.toThrow("Unauthorized");
  });

  it("throws an ApiError carrying the response status and details", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: "Invalid request body",
              details: { fieldErrors: { name: ["Required"] } },
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          ),
        ),
    );

    await expect(apiFetch("/transactions")).rejects.toMatchObject({
      status: 400,
      details: { fieldErrors: { name: ["Required"] } },
    });
  });

  it("throws a 401 ApiError when there is no auth session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    const error = await apiFetch("/transactions").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });
});
