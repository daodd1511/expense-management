import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "./logger";
import { jsonError, type ApiErrorStatus } from "../lib/response";

type DbError = {
  code: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: ApiErrorStatus,
    readonly clientMessage: string,
    readonly details?: unknown,
  ) {
    super(clientMessage);
    this.name = "ApiError";
  }
}

function isDbError(error: unknown): error is DbError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

function mapDbError(c: Context, error: DbError) {
  if (error.code === "23505") {
    logger.error({ error }, "database unique constraint violation");
    return jsonError(c, 409, "This item already exists");
  }

  if (error.code === "23503") {
    logger.error({ error }, "database foreign key violation");
    return jsonError(c, 409, "This action conflicts with related data");
  }

  // Raised deliberately by our own plpgsql functions (loan lifecycle RPCs) with clean,
  // user-facing messages — unlike the generic fallback below, always safe to pass through.
  if (error.code === "P0002") {
    logger.error({ error }, "database not found");
    return jsonError(c, 404, error.message);
  }

  if (error.code === "22023") {
    logger.error({ error }, "database domain validation error");
    return jsonError(c, 400, error.message);
  }

  logger.error({ error }, "database unexpected error");
  return jsonError(
    c,
    500,
    isDev ? error.message : "Internal server error",
    isDev ? { code: error.code } : undefined,
  );
}

/** Centralized error middleware for typed service errors and raw Postgres failures. */
export function handleError(error: unknown, c: Context) {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      logger.error({ error }, "application error");
    }

    return jsonError(c, error.status, error.clientMessage, error.details);
  }

  if (isDbError(error)) {
    return mapDbError(c, error);
  }

  logger.error({ error }, "uncaught application error");
  const message = isDev && error instanceof Error ? error.message : "Internal server error";
  return jsonError(c, 500, message);
}

/**
 * Hono's dispatcher only routes thrown values to `app.onError` when `err instanceof
 * Error` (see node_modules/hono/dist/compose.js) — but supabase-js's PostgrestError,
 * thrown as-is by every repository's `if (error) throw error`, is a plain object, not
 * an Error instance. Uncaught, it silently escapes `handleError` as an unhandled
 * rejection instead of producing a mapped JSON response. Wrapping it in a real Error
 * here (first middleware in the chain) fixes that for every feature, not just the one
 * that surfaced it — `Object.assign` copies `code`/`message`/`details`/`hint` onto the
 * new Error so `isDbError`/`mapDbError` still recognize it unchanged.
 */
export const errorMiddleware = createMiddleware(async (_c, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof Error) throw error;
    if (typeof error === "object" && error !== null) {
      throw Object.assign(
        new Error(String((error as { message?: unknown }).message ?? "Unknown error")),
        error,
      );
    }
    throw new Error(String(error));
  }
});
