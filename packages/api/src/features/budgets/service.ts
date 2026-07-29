import { conflictingBudget, type BudgetCreate, type BudgetPatch } from "@wallet/shared";
import { ApiError } from "../../middleware/error";
import * as categoriesService from "../categories/service";
import * as repository from "./repository";

async function assertNoConflict(
  userId: string,
  categoryId: string,
  scope: BudgetCreate["scope"],
  excludeCategoryId?: string,
) {
  const [budgets, categories] = await Promise.all([
    repository.listBudgets(userId),
    categoriesService.listCategories(userId),
  ]);

  const conflict = conflictingBudget(categoryId, scope, budgets, categories, excludeCategoryId);
  if (conflict) {
    throw new ApiError(409, "Budget conflict", { categoryId: conflict.categoryId });
  }
}

export async function listBudgets(userId: string) {
  return repository.listBudgets(userId);
}

export async function createBudget(userId: string, budget: BudgetCreate) {
  await assertNoConflict(userId, budget.categoryId, budget.scope);
  return repository.createBudget(userId, budget);
}

export async function updateBudget(userId: string, categoryId: string, patch: BudgetPatch) {
  if (patch.scope) {
    await assertNoConflict(userId, categoryId, patch.scope, categoryId);
  }

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
