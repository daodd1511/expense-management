import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./api";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends same-origin credentials and JSON headers for requests with a body", async () => {
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
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  });

  it("surfaces API JSON errors when present", async () => {
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
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

  it("throws a 401 ApiError when the server rejects the session cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const error = await apiFetch("/transactions").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });
});
