import { Hono } from "hono";
import { cors } from "hono/cors";
import { checkDatabaseReadiness } from "./db/database";
import { accountsRouter } from "./features/accounts/routes";
import { analyticsRouter } from "./features/analytics/routes";
import { budgetsRouter } from "./features/budgets/routes";
import { categoriesRouter } from "./features/categories/routes";
import { favoritesRouter } from "./features/favorites/routes";
import { loansRouter, peopleRouter } from "./features/loans/routes";
import { reportsRouter } from "./features/reports/routes";
import { subscriptionsRouter } from "./features/subscriptions/routes";
import { transactionsRouter } from "./features/transactions/routes";
import {
  createAuthMiddleware,
  type AppTransactionRunner,
  type AuthEnv,
  type IdentityResolver,
} from "./middleware/auth";
import { errorMiddleware, handleError } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";

export type AppDependencies = {
  resolveIdentity?: IdentityResolver;
  runWithTransaction?: AppTransactionRunner;
  checkReadiness?: () => Promise<void>;
};

/** Builds the Hono app with cross-cutting middleware and all feature routes wired in. */
export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono<AuthEnv>();

  app.use("*", loggerMiddleware);
  app.use("*", cors());
  app.use("*", errorMiddleware);
  app.onError(handleError);

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/health/ready", async (c) => {
    try {
      await (dependencies.checkReadiness ?? checkDatabaseReadiness)();
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });

  const api = app.basePath("/api");
  api.use("*", createAuthMiddleware(dependencies.resolveIdentity, dependencies.runWithTransaction));
  api.route("/transactions", transactionsRouter);
  api.route("/accounts", accountsRouter);
  api.route("/categories", categoriesRouter);
  api.route("/budgets", budgetsRouter);
  api.route("/favorites", favoritesRouter);
  api.route("/loans", loansRouter);
  api.route("/people", peopleRouter);
  api.route("/reports", reportsRouter);
  api.route("/subscriptions", subscriptionsRouter);
  api.route("/analytics", analyticsRouter);

  return app;
}
