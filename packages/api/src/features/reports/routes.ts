import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import { reportQuerySchema, type ReportQuery } from "./schema";

export const reportsRouter = new Hono<AuthEnv>();

reportsRouter.get(
  "/income-expense",
  zValidator("query", reportQuerySchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request query", z.flattenError(result.error));
    }
  }),
  (c) => controller.getIncomeExpenseReport(c, c.req.valid("query") as ReportQuery),
);
reportsRouter.get(
  "/financial-position",
  zValidator("query", reportQuerySchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request query", z.flattenError(result.error));
    }
  }),
  (c) => controller.getFinancialPosition(c, c.req.valid("query") as ReportQuery),
);
