import { conflictingBudget, type BudgetCreate, type BudgetPatch } from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as categoriesService from "../categories/service";
import * as repository from "./repository";

async function assertNoConflict(
  db: AppDb,
  userId: string,
  categoryId: string,
  scope: BudgetCreate["scope"],
  excludeCategoryId?: string,
) {
  const [budgets, categories] = await Promise.all([
    repository.listBudgets(db, userId),
    categoriesService.listCategories(db, userId),
  ]);

  const conflict = conflictingBudget(categoryId, scope, budgets, categories, excludeCategoryId);
  if (conflict) {
    throw new ApiError(409, "Budget conflict", { categoryId: conflict.categoryId });
  }
}

export async function listBudgets(db: AppDb, userId: string) {
  return repository.listBudgets(db, userId);
}

export async function createBudget(db: AppDb, userId: string, budget: BudgetCreate) {
  await assertNoConflict(db, userId, budget.categoryId, budget.scope);
  return repository.createBudget(db, userId, budget);
}

export async function updateBudget(
  db: AppDb,
  userId: string,
  categoryId: string,
  patch: BudgetPatch,
) {
  if (patch.scope) {
    await assertNoConflict(db, userId, categoryId, patch.scope, categoryId);
  }

  const budget = await repository.updateBudget(db, userId, categoryId, patch);
  if (!budget) {
    throw new ApiError(404, "Budget not found");
  }

  return budget;
}

export async function deleteBudget(db: AppDb, userId: string, categoryId: string) {
  const deleted = await repository.deleteBudget(db, userId, categoryId);
  if (!deleted) {
    throw new ApiError(404, "Budget not found");
  }
}
