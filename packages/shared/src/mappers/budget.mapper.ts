import type { Budget } from "../models";
import type { BudgetPatch, BudgetRow } from "../dtos";

export function toBudget(row: BudgetRow): Budget {
  return { categoryId: row.category_id, limit: row.amount, scope: row.scope };
}

export function fromBudget(params: { budget: Budget; ownerId: string }) {
  const { budget, ownerId } = params;
  return {
    owner_id: ownerId,
    category_id: budget.categoryId,
    amount: budget.limit,
    scope: budget.scope,
  };
}

export function budgetPatchToRow(patch: BudgetPatch) {
  return {
    amount: patch.limit,
    ...(patch.scope ? { scope: patch.scope } : {}),
  };
}
