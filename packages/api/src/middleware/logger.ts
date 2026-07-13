import { createMiddleware } from "hono/factory";
import pino from "pino";

export const logger = pino({
  name: "wallet-api",
});

/** Logs one structured entry per request with the final response status and latency. */
export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = performance.now();
  await next();

  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Number((performance.now() - start).toFixed(2)),
    },
    "request completed",
  );
});
