import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { hasTestDatabase } from "../db/test-helpers";
import { USER_A, withApiTestDatabase } from "../test/postgres-fixture";

vi.setConfig({ testTimeout: 20_000 });

describe("health boundaries", () => {
  it("keeps process liveness independent from database readiness", async () => {
    const checkReadiness = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const app = createApp({ checkReadiness });

    await expect((await app.request("/health")).json()).resolves.toEqual({ ok: true });
    expect(checkReadiness).not.toHaveBeenCalled();

    const readiness = await app.request("/health/ready");
    expect(readiness.status).toBe(503);
    await expect(readiness.json()).resolves.toEqual({ ok: false });
    expect(checkReadiness).toHaveBeenCalledOnce();
  });

  it("reports readiness after the database check succeeds", async () => {
    const checkReadiness = vi.fn().mockResolvedValue(undefined);
    const readiness = await createApp({ checkReadiness }).request("/health/ready");

    expect(readiness.status).toBe(200);
    await expect(readiness.json()).resolves.toEqual({ ok: true });
  });
});

describe.skipIf(!hasTestDatabase)("protected request boundary", () => {
  it("returns 401 without a server identity and does not query User-owned data", async () => {
    await withApiTestDatabase(async ({ request }) => {
      const response = await request(null, "/api/accounts");

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });
  });

  it("stores the resolved User and transaction-bound database executor in context", async () => {
    await withApiTestDatabase(async ({ request }) => {
      const response = await request(USER_A, "/api/accounts");

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: [] });
    });
  });

  it("returns 401 when the identity resolver rejects an unknown identity", async () => {
    await withApiTestDatabase(async ({ app }) => {
      const response = await app.request("/api/accounts", {
        headers: { "x-test-user-id": "33333333-3333-3333-3333-333333333333" },
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });
  });
});
