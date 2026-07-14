import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import { fetchFinancialPosition, fetchIncomeExpenseReport } from "./db";

type ReportRange = { from: string; to: string };

export const reportQueryKeys = {
  incomeExpense: (userId: string | undefined, params: ReportRange) =>
    ["reports", userId, "income-expense", params.from, params.to] as const,
  financialPosition: (userId: string | undefined, params: ReportRange) =>
    ["reports", userId, "financial-position", params.from, params.to] as const,
};

export function useIncomeExpenseReport(params: ReportRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: reportQueryKeys.incomeExpense(user?.id, params),
    queryFn: () => fetchIncomeExpenseReport(params),
    enabled: !!user,
  });
}

export function useFinancialPosition(params: ReportRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: reportQueryKeys.financialPosition(user?.id, params),
    queryFn: () => fetchFinancialPosition(params),
    enabled: !!user,
  });
}
