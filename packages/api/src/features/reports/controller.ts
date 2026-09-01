import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import type { ReportQuery, SpendingAnalysisQuery } from "./schema";
import * as service from "./service";

export async function getIncomeExpenseReport(c: Context<AuthEnv>, query: ReportQuery) {
  const { from, to } = query;
  return c.json(await service.getIncomeExpenseReport(c.get("db"), c.get("userId"), from, to));
}

export async function getFinancialPosition(c: Context<AuthEnv>, query: ReportQuery) {
  const { from, to } = query;
  return c.json(await service.getFinancialPosition(c.get("db"), c.get("userId"), from, to));
}

export async function getSpendingAnalysisReport(c: Context<AuthEnv>, query: SpendingAnalysisQuery) {
  const { from, to, preset } = query;
  return c.json(
    await service.getSpendingAnalysisReport(c.get("db"), c.get("userId"), from, to, preset),
  );
}
