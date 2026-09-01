import { isIP } from "node:net";
import { betterAuth, type Auth } from "better-auth";
import type { Context } from "hono";
import type { Pool } from "pg";
import { getAuthEnv, type AuthConfig } from "../config/env";
import { getAuthPool } from "../db/database";
import type { AuthEnv, IdentityResolver } from "../middleware/auth";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const ONE_YEAR_SECONDS = ONE_DAY_SECONDS * 365;

export type WalletAuth = Auth;

/** Builds Better Auth without allowing it to mutate the Dbmate-owned schema. */
export function createBetterAuth(pool: Pool, config: AuthConfig): WalletAuth {
  return betterAuth({
    appName: "Wallet",
    baseURL: config.baseUrl,
    basePath: "/api/auth",
    secret: config.secret,
    database: pool,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: ONE_YEAR_SECONDS,
      updateAge: ONE_DAY_SECONDS,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    trustedOrigins: [new URL(config.baseUrl).origin],
    trustedProxyHeaders: false,
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      },
      database: { generateId: () => crypto.randomUUID() },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = user.email.trim().toLowerCase();
            return { data: { ...user, email, name: email } };
          },
        },
      },
    },
  });
}

let defaultAuth: WalletAuth | undefined;

export function getBetterAuth(): WalletAuth {
  defaultAuth ??= createBetterAuth(getAuthPool(), getAuthEnv());
  return defaultAuth;
}

const FORWARDED_HEADERS = [
  "cf-connecting-ip",
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
] as const;

function requestHasForwardedHeaders(headers: Headers): boolean {
  return FORWARDED_HEADERS.some((name) => headers.has(name));
}

function forwardedClientIp(headers: Headers): string | null {
  const value = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  const candidate = value?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

/**
 * Returns a request Better Auth may trust, or null when a direct client attempts to
 * supply proxy headers. Better Auth receives one validated client IP and never sees
 * forwarded host/protocol values.
 */
export function normalizeAuthRequest(request: Request, proxyIsTrusted: boolean): Request | null {
  if (!requestHasForwardedHeaders(request.headers)) {
    return request;
  }
  if (!proxyIsTrusted) {
    return null;
  }

  const clientIp = forwardedClientIp(request.headers);
  if (!clientIp) {
    return null;
  }

  const headers = new Headers(request.headers);
  for (const name of FORWARDED_HEADERS) headers.delete(name);
  headers.set("x-forwarded-for", clientIp);
  return new Request(request, { headers });
}

export type AuthRequestNormalizer = (c: Context<AuthEnv>) => Request | null;

export function createAuthRequestNormalizer(
  config: AuthConfig = getAuthEnv(),
): AuthRequestNormalizer {
  return (c) =>
    normalizeAuthRequest(c.req.raw, config.isTrustedProxy(c.env?.incoming?.socket.remoteAddress));
}

export function createSessionIdentityResolver(
  auth: WalletAuth = getBetterAuth(),
  normalizeRequest: AuthRequestNormalizer = createAuthRequestNormalizer(),
): IdentityResolver {
  return async (c) => {
    const request = normalizeRequest(c);
    if (!request) return null;
    const session = await auth.api.getSession({
      headers: request.headers,
      returnHeaders: true,
    });
    for (const cookie of session.headers.getSetCookie()) {
      c.header("set-cookie", cookie, { append: true });
    }
    return session.response?.user.id ?? null;
  };
}
