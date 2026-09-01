import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import type { DashboardSummaryQuery } from "./schema";
import * as service from "./service";

export async function getBalanceTrend(c: Context<AuthEnv>) {
  return c.json(
    await service.getBalanceTrend(c.get("db"), c.get("userId"), c.req.query("referenceMonth")),
  );
}

export async function getDashboardSummary(c: Context<AuthEnv>, query: DashboardSummaryQuery) {
  return c.json(await service.getDashboardSummary(c.get("db"), c.get("userId"), query.today));
}

export async function getNetWorthTrend(c: Context<AuthEnv>) {
  return c.json(
    await service.getNetWorthTrend(c.get("db"), c.get("userId"), c.req.query("referenceMonth")),
  );
}
