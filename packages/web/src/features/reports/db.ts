import { apiJson } from "@/core/api";
import {
  financialPositionResponseSchema,
  incomeExpenseReportResponseSchema,
  spendingAnalysisReportResponseSchema,
} from "@wallet/shared";
import type {
  FinancialPositionResponse,
  IncomeExpenseReportResponse,
  SpendingAnalysisPreset,
  SpendingAnalysisReportResponse,
} from "@wallet/shared";

export async function fetchIncomeExpenseReport(params: {
  from: string;
  to: string;
}): Promise<IncomeExpenseReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });

  return apiJson(`/reports/income-expense?${search.toString()}`, incomeExpenseReportResponseSchema);
}

export async function fetchFinancialPosition(params: {
  from: string;
  to: string;
}): Promise<FinancialPositionResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });

  return apiJson(
    `/reports/financial-position?${search.toString()}`,
    financialPositionResponseSchema,
  );
}

export async function fetchSpendingAnalysis(params: {
  from: string;
  to: string;
  preset: SpendingAnalysisPreset;
}): Promise<SpendingAnalysisReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    preset: params.preset,
  });

  return apiJson(
    `/reports/spending-analysis?${search.toString()}`,
    spendingAnalysisReportResponseSchema,
  );
}
