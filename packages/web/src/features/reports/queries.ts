import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import { fetchIncomeExpenseReport } from "./db";

export function useIncomeExpenseReport(params: { from: string; to: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reports", user?.id, "income-expense", params.from, params.to],
    queryFn: () => fetchIncomeExpenseReport(params),
    enabled: !!user,
  });
}
