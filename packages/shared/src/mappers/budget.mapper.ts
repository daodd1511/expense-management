import type { Budget } from "../models";
import type { BudgetRow } from "../dtos";

export function toBudget(row: BudgetRow): Budget {
  return { categoryId: row.category_id, limit: row.amount };
}

export function fromBudget(params: { budget: Budget; ownerId: string }) {
  const { budget, ownerId } = params;
  return {
    owner_id: ownerId,
    category_id: budget.categoryId,
    amount: budget.limit,
  };
}

export function budgetPatchToRow(limit: number) {
  return { amount: limit };
}
