import { Hono } from "hono";
import type { AuthEnv } from "../middleware/auth";
import {
  createAuthRequestNormalizer,
  getBetterAuth,
  type AuthRequestNormalizer,
  type WalletAuth,
} from "./better-auth";

export function createAuthRoutes(auth?: WalletAuth, normalizeRequest?: AuthRequestNormalizer) {
  const routes = new Hono<AuthEnv>();

  routes.all("/*", async (c) => {
    const request = (normalizeRequest ?? createAuthRequestNormalizer())(c);
    if (!request) return c.json({ error: "Invalid proxy headers" }, 400);
    return (auth ?? getBetterAuth()).handler(request);
  });

  return routes;
}
