import { z } from "zod";
import type { Budget } from "@/core/types";
import { apiJson } from "@/core/api";
import { budgetSchema, type BudgetPatch } from "@wallet/shared";

const budgetsResponseSchema = z.object({
  data: z.array(budgetSchema),
});

const budgetResponseSchema = z.object({
  data: budgetSchema,
});

const okResponseSchema = z.object({
  ok: z.literal(true),
});

export async function fetchBudgets(): Promise<Budget[]> {
  const response = await apiJson("/budgets", budgetsResponseSchema);
  return response.data;
}

export async function insertBudget(budget: Budget): Promise<void> {
  await apiJson("/budgets", budgetResponseSchema, {
    method: "POST",
    body: JSON.stringify(budget),
  });
}

export async function updateBudget(categoryId: string, patch: BudgetPatch): Promise<void> {
  await apiJson(`/budgets/${categoryId}`, budgetResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteBudget(categoryId: string): Promise<void> {
  await apiJson(`/budgets/${categoryId}`, okResponseSchema, {
    method: "DELETE",
  });
}
