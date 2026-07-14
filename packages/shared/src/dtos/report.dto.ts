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
