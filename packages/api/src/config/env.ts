type Env = Readonly<{
  port: number;
}>;

export type AuthConfig = Readonly<{
  baseUrl: string;
  secret: string;
  isTrustedProxy(address: string | undefined): boolean;
}>;

let cachedEnv: Env | null = null;

/** Returns process-level API configuration; database URLs are read lazily by the DB pools. */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    port: Number(process.env.PORT ?? 3000),
  };

  return cachedEnv;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeAddress(address: string): string {
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

/** Returns the auth security boundary separately so health/bootstrap stays lazy. */
export function getAuthEnv(): AuthConfig {
  const baseUrl = requireEnv("BETTER_AUTH_URL");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use https");
  }

  const trustedProxies = new Set(
    requireEnv("AUTH_TRUSTED_PROXY_IPS")
      .split(",")
      .map((address) => normalizeAddress(address.trim()))
      .filter(Boolean),
  );

  return {
    baseUrl: url.origin,
    secret: requireEnv("BETTER_AUTH_SECRET"),
    isTrustedProxy: (address) => Boolean(address && trustedProxies.has(normalizeAddress(address))),
  };
}
