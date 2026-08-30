import { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { createAppDatabase } from "../db/database";
import { hasTestDatabase, withMigratedDatabase } from "../db/test-helpers";
import { createBetterAuth, normalizeAuthRequest } from "./better-auth";

vi.setConfig({ testTimeout: 30_000 });

const BASE_URL = "https://wallet.test";
const TEST_SECRET = "test-only-better-auth-secret-at-least-32-characters";

function cookieHeader(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected Better Auth to set a session cookie");
  return setCookie.split(";", 1)[0];
}

function authRequest(path: string, body: unknown, cookie?: string): RequestInit {
  const headers = new Headers({
    "content-type": "application/json",
    origin: BASE_URL,
  });
  if (cookie) headers.set("cookie", cookie);
  return { method: "POST", headers, body: JSON.stringify(body) };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy header boundary", () => {
  it("rejects forwarded headers from direct requests", () => {
    const request = new Request(`${BASE_URL}/api/auth/get-session`, {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    expect(normalizeAuthRequest(request, false)).toBeNull();
  });

  it("keeps only one validated client IP from a trusted proxy", () => {
    const request = new Request(`${BASE_URL}/api/auth/get-session`, {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.8, 10.0.0.2",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
      },
    });

    const normalized = normalizeAuthRequest(request, true);

    expect(normalized?.headers.get("x-forwarded-for")).toBe("203.0.113.10");
    expect(normalized?.headers.has("cf-connecting-ip")).toBe(false);
    expect(normalized?.headers.has("x-forwarded-host")).toBe(false);
    expect(normalized?.headers.has("x-forwarded-proto")).toBe(false);
  });
});

describe.skipIf(!hasTestDatabase)("Better Auth integration", () => {
  it("creates UUID Users, uses revocable secure sessions, and rate-limits in PostgreSQL", async () => {
    await withMigratedDatabase(async ({ appUrl, authUrl }) => {
      const authPool = new Pool({ connectionString: authUrl, options: "-c search_path=auth" });
      const appDatabase = createAppDatabase(appUrl);
      const auth = createBetterAuth(authPool, {
        baseUrl: BASE_URL,
        secret: TEST_SECRET,
        isTrustedProxy: () => false,
      });
      const app = createApp({
        auth,
        normalizeAuthRequest: (c) => normalizeAuthRequest(c.req.raw, false),
        runWithTransaction: appDatabase.withAppTransaction,
      });

      try {
        const signUp = await app.request(
          "/api/auth/sign-up/email",
          authRequest("/api/auth/sign-up/email", {
            email: "Person@Example.COM",
            password: "correct-horse-battery-staple",
            name: "Untrusted display name",
          }),
        );

        expect(signUp.status, await signUp.clone().text()).toBe(200);
        const cookie = cookieHeader(signUp);
        const setCookie = signUp.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain("Secure");
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie.toLowerCase()).toContain("samesite=lax");
        expect(setCookie.toLowerCase()).not.toContain("domain=");
        expect(cookie).not.toContain("person@example.com");

        const userResult = await authPool.query<{ id: string; email: string; name: string }>(
          'select id, email, name from auth."user"',
        );
        expect(userResult.rows).toHaveLength(1);
        expect(userResult.rows[0]).toMatchObject({
          email: "person@example.com",
          name: "person@example.com",
        });
        expect(userResult.rows[0]?.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(cookie).not.toContain(userResult.rows[0]?.id ?? "missing");

        const sessionResult = await authPool.query<{ remaining_seconds: number }>(
          'select extract(epoch from ("expiresAt" - now()))::int as remaining_seconds from auth."session"',
        );
        expect(sessionResult.rows[0]?.remaining_seconds).toBeGreaterThan(364 * 24 * 60 * 60);

        const agedSession = await authPool.query<{ expires_at: Date }>(
          'update auth."session" set "expiresAt" = now() + interval \'363 days\' returning "expiresAt" as expires_at',
        );

        const protectedResponse = await app.request("/api/accounts", {
          headers: { cookie, origin: BASE_URL },
        });
        expect(protectedResponse.status).toBe(200);
        const refreshedCookie = protectedResponse.headers.get("set-cookie") ?? "";
        const refreshedMaxAge = Number(refreshedCookie.match(/Max-Age=(\d+)/)?.[1]);
        expect(refreshedMaxAge).toBeGreaterThan(364 * 24 * 60 * 60);
        expect(refreshedCookie).toContain("Secure");
        expect(refreshedCookie).toContain("HttpOnly");
        expect(refreshedCookie.toLowerCase()).toContain("samesite=lax");

        const refreshedSession = await authPool.query<{ expires_at: Date }>(
          'select "expiresAt" as expires_at from auth."session"',
        );
        expect(refreshedSession.rows[0]?.expires_at.getTime()).toBeGreaterThan(
          agedSession.rows[0]?.expires_at.getTime() ?? Number.POSITIVE_INFINITY,
        );

        const spoofedProxy = await app.request("/api/accounts", {
          headers: {
            cookie,
            origin: BASE_URL,
            "x-forwarded-for": "203.0.113.10",
          },
        });
        expect(spoofedProxy.status).toBe(401);

        const signOut = await app.request(
          "/api/auth/sign-out",
          authRequest("/api/auth/sign-out", {}, cookie),
        );
        expect(signOut.status).toBe(200);

        const revoked = await app.request("/api/accounts", {
          headers: { cookie, origin: BASE_URL },
        });
        expect(revoked.status).toBe(401);

        const rateLimitResult = await authPool.query<{ count: string }>(
          'select count(*)::text as count from auth."rateLimit"',
        );
        expect(Number(rateLimitResult.rows[0]?.count)).toBeGreaterThan(0);
      } finally {
        await appDatabase.close();
        await authPool.end();
      }
    });
  });
});
