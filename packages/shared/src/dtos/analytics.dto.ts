import { z } from "zod";
import { monthFilterSchema } from "./common.dto";
import { financialPositionAccountStateSchema } from "./report.dto";

export const balanceTrendPointSchema = z.object({
  month: monthFilterSchema,
  balance: z.number(),
});

export const balanceTrendResponseSchema = z.object({
  data: z.array(balanceTrendPointSchema),
});

// Owed-to-user/user-owes are lending/borrowing outstanding sums; overdue count comes from
// each loan's own derived status (PLAN.md -> Dashboard's compact Loans summary).
export const loansSummarySchema = z.object({
  owedToUser: z.number(),
  userOwes: z.number(),
  netPosition: z.number(),
  overdueCount: z.number(),
});

export const dashboardSummarySchema = z.object({
  netWorth: financialPositionAccountStateSchema,
  loans: loansSummarySchema,
});

export const dashboardSummaryResponseSchema = z.object({
  data: dashboardSummarySchema,
});

// Distinct from balanceTrendPointSchema: each point also folds in loan events as-of that
// month-end boundary, since net worth (unlike the liquidity-only balance trend) includes
// lending/borrowing outstanding (PLAN.md -> Dashboard).
export const netWorthTrendPointSchema = z.object({
  month: monthFilterSchema,
  netWorth: z.number(),
  accountTotal: z.number(),
  lendingOutstanding: z.number(),
  borrowingOutstanding: z.number(),
});

export const netWorthTrendResponseSchema = z.object({
  data: z.array(netWorthTrendPointSchema),
});

export type BalanceTrendPoint = z.infer<typeof balanceTrendPointSchema>;
export type BalanceTrendResponse = z.infer<typeof balanceTrendResponseSchema>;
export type LoansSummary = z.infer<typeof loansSummarySchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
export type NetWorthTrendPoint = z.infer<typeof netWorthTrendPointSchema>;
export type NetWorthTrendResponse = z.infer<typeof netWorthTrendResponseSchema>;
