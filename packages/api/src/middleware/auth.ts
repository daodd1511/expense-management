import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { withAppTransaction, type AppDb } from "../db/database";
import { jsonError } from "../lib/response";

export type AuthEnv = {
  Variables: {
    userId: string;
    db: AppDb;
  };
};

export type IdentityResolver = (c: Context<AuthEnv>) => Promise<string | null>;
export type AppTransactionRunner = typeof withAppTransaction;

const rejectIdentity: IdentityResolver = async () => null;

/** Builds the protected-request boundary. Phase 3 supplies the Better Auth resolver. */
export function createAuthMiddleware(
  resolveIdentity: IdentityResolver = rejectIdentity,
  runWithTransaction: AppTransactionRunner = withAppTransaction,
) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    let userId: string | null;
    try {
      userId = await resolveIdentity(c);
    } catch {
      return jsonError(c, 401, "Unauthorized");
    }

    if (typeof userId !== "string" || userId.length === 0) {
      return jsonError(c, 401, "Unauthorized");
    }

    await runWithTransaction(userId, async (db) => {
      c.set("userId", userId);
      c.set("db", db);
      await next();
    });
  });
}

export const authMiddleware = createAuthMiddleware();
