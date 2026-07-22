import { z } from "zod";
import { categoryTypeSchema } from "../models";
import { isoDateSchema, monthFilterSchema } from "./common.dto";

export const reportTransactionRowSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  merchant: z.string(),
  note: z.string().optional(),
  amount: z.number(),
  accountId: z.string(),
});

export const reportCategoryAggregateSchema = z.object({
  categoryId: z.string(),
  parentCategoryId: z.string().nullable(),
  type: categoryTypeSchema,
  amount: z.number(),
  transactionCount: z.number(),
  percentage: z.number(),
  transactions: z.array(reportTransactionRowSchema),
});

export const reportSeriesPointSchema = z.object({
  period: monthFilterSchema,
  income: z.number(),
  expense: z.number(),
  net: z.number(),
});

export const incomeExpenseReportSchema = z.object({
  range: z.object({
    from: isoDateSchema,
    to: isoDateSchema,
    granularity: z.literal("month"),
  }),
  totals: z.object({
    income: z.number(),
    expense: z.number(),
    net: z.number(),
    transactionCount: z.number(),
  }),
  series: z.array(reportSeriesPointSchema),
  categories: z.array(reportCategoryAggregateSchema),
});

export const incomeExpenseReportResponseSchema = z.object({
  data: incomeExpenseReportSchema,
});

export const financialPositionAccountStateSchema = z.object({
  accountTotal: z.number(),
  lendingOutstanding: z.number(),
  borrowingOutstanding: z.number(),
  netWorth: z.number(),
});

const reconciliationCheckSchema = z.object({
  expected: z.number(),
  actual: z.number(),
  matches: z.boolean(),
});

export const financialPositionSchema = z.object({
  range: z.object({ from: isoDateSchema, to: isoDateSchema }),
  opening: financialPositionAccountStateSchema,
  closing: financialPositionAccountStateSchema,
  income: z.number(),
  expense: z.number(),
  surplus: z.number(),
  loanCashFlow: z.object({
    lent: z.number(),
    borrowed: z.number(),
    lendingRepaymentsReceived: z.number(),
    borrowingRepaymentsPaid: z.number(),
    net: z.number(),
  }),
  balanceAdjustments: z.number(),
  writeOffs: z.number(),
  forgiveness: z.number(),
  openingLoanAdjustments: z.object({
    lending: z.number(),
    borrowing: z.number(),
  }),
  reconciliation: z.object({
    accountTotal: reconciliationCheckSchema,
    netWorth: reconciliationCheckSchema,
  }),
});

export const financialPositionResponseSchema = z.object({
  data: financialPositionSchema,
});

export type ReportTransactionRow = z.infer<typeof reportTransactionRowSchema>;
export type ReportCategoryAggregate = z.infer<typeof reportCategoryAggregateSchema>;
export type ReportSeriesPoint = z.infer<typeof reportSeriesPointSchema>;
export type IncomeExpenseReport = z.infer<typeof incomeExpenseReportSchema>;
export type IncomeExpenseReportResponse = z.infer<typeof incomeExpenseReportResponseSchema>;
export type FinancialPosition = z.infer<typeof financialPositionSchema>;
export type FinancialPositionResponse = z.infer<typeof financialPositionResponseSchema>;

export const spendingAnalysisPresetSchema = z.enum([
  "this-month",
  "previous-month",
  "last-3-months",
  "last-6-months",
  "last-12-months",
  "custom",
]);

export const spendingChangeSchema = z.object({
  current: z.number(),
  previous: z.number(),
  change: z.number(),
  changePercentage: z.number().nullable(),
});

export const spendingTrendGranularitySchema = z.enum(["day", "week", "month"]);

export const spendingTrendPointSchema = z.object({
  index: z.number(),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  comparisonPeriodStart: isoDateSchema.nullable(),
  comparisonPeriodEnd: isoDateSchema.nullable(),
  current: z.number(),
  previous: z.number(),
});

export const spendingCategoryChildAggregateSchema = z.object({
  categoryId: z.string(),
  ...spendingChangeSchema.shape,
  share: z.number(),
  transactionCount: z.number(),
  transactions: z.array(reportTransactionRowSchema),
});

export const spendingCategoryAggregateSchema = z.object({
  categoryId: z.string().nullable(),
  ...spendingChangeSchema.shape,
  share: z.number(),
  transactionCount: z.number(),
  transactions: z.array(reportTransactionRowSchema),
  children: z.array(spendingCategoryChildAggregateSchema),
});

export const spendingAnalysisReportSchema = z.object({
  range: z.object({ from: isoDateSchema, to: isoDateSchema }),
  comparisonRange: z.object({ from: isoDateSchema, to: isoDateSchema }),
  trendGranularity: spendingTrendGranularitySchema,
  totals: spendingChangeSchema,
  trend: z.array(spendingTrendPointSchema),
  categories: z.array(spendingCategoryAggregateSchema),
});

export const spendingAnalysisReportResponseSchema = z.object({
  data: spendingAnalysisReportSchema,
});

export type SpendingAnalysisPreset = z.infer<typeof spendingAnalysisPresetSchema>;
export type SpendingChange = z.infer<typeof spendingChangeSchema>;
export type SpendingTrendGranularity = z.infer<typeof spendingTrendGranularitySchema>;
export type SpendingTrendPoint = z.infer<typeof spendingTrendPointSchema>;
export type SpendingCategoryChildAggregate = z.infer<typeof spendingCategoryChildAggregateSchema>;
export type SpendingCategoryAggregate = z.infer<typeof spendingCategoryAggregateSchema>;
export type SpendingAnalysisReport = z.infer<typeof spendingAnalysisReportSchema>;
export type SpendingAnalysisReportResponse = z.infer<typeof spendingAnalysisReportResponseSchema>;
