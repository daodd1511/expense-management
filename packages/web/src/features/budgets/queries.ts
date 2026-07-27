import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetCoverage } from "@wallet/shared";
import { useAuth } from "@/features/auth/auth";
import { deleteBudget, fetchBudgets, insertBudget, updateBudget } from "@/features/budgets/db";
import { useCategories } from "@/features/categories/queries";
import { useTransactions } from "@/features/transactions/queries";
import type { Budget } from "@/core/types";

export function useBudgets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budgets", user?.id],
    queryFn: fetchBudgets,
    enabled: !!user,
  });
}

export function useAddBudget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (budget: Budget) => insertBudget(budget),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", user?.id] }),
  });
}

export function useUpdateBudget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, limit, scope }: Budget) =>
      updateBudget(categoryId, { limit, scope }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", user?.id] }),
  });
}

/** Resolves a budget's current-month expense total, covering its subcategories when `scope` is `tree`. */
export function useBudgetSpend(): (budget: Budget) => number {
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();

  return (budget: Budget) => {
    const coverage = budgetCoverage(budget, categories);
    let total = 0;
    for (const transaction of transactions) {
      if (
        transaction.type === "expense" &&
        transaction.categoryId &&
        coverage.has(transaction.categoryId)
      ) {
        total += transaction.amount;
      }
    }
    return total;
  };
}

export function useDeleteBudget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteBudget(categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", user?.id] }),
  });
}
