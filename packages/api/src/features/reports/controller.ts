import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import type { ReportQuery } from "./schema";
import * as service from "./service";

export async function getIncomeExpenseReport(c: Context<AuthEnv>, query: ReportQuery) {
  const { from, to } = query;
  return c.json(await service.getIncomeExpenseReport(c.get("userId"), from, to));
}
