import type { BudgetCreate, BudgetPatch } from "@wallet/shared";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listBudgets(userId: string) {
  return repository.listBudgets(userId);
}

export async function createBudget(userId: string, budget: BudgetCreate) {
  return repository.createBudget(userId, budget);
}

export async function updateBudget(userId: string, categoryId: string, patch: BudgetPatch) {
  const budget = await repository.updateBudget(userId, categoryId, patch);
  if (!budget) {
    throw new ApiError(404, "Budget not found");
  }

  return budget;
}

export async function deleteBudget(userId: string, categoryId: string) {
  const deleted = await repository.deleteBudget(userId, categoryId);
  if (!deleted) {
    throw new ApiError(404, "Budget not found");
  }
}
