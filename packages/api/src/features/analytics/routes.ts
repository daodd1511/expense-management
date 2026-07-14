import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { jsonError } from "../../lib/response";
import type { AuthEnv } from "../../middleware/auth";
import * as controller from "./controller";
import { dashboardSummaryQuerySchema, type DashboardSummaryQuery } from "./schema";

export const analyticsRouter = new Hono<AuthEnv>();

analyticsRouter.get("/balance-trend", controller.getBalanceTrend);
analyticsRouter.get("/net-worth-trend", controller.getNetWorthTrend);
analyticsRouter.get(
  "/dashboard-summary",
  zValidator("query", dashboardSummaryQuerySchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request query", z.flattenError(result.error));
    }
  }),
  (c) => controller.getDashboardSummary(c, c.req.valid("query") as DashboardSummaryQuery),
);
