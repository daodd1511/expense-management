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

export const errorMiddleware = createMiddleware(async (_c, next) => {
  await next();
});
