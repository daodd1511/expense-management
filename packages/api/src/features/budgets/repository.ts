import {
  budgetPatchToRow,
  budgetRowSchema,
  fromBudget,
  toBudget,
  type Budget,
  type BudgetCreate,
  type BudgetPatch,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

function parseBudgetRow(data: unknown, message: string): Budget {
  const result = budgetRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toBudget(result.data);
}

export async function listBudgets(db: AppDb, userId: string) {
  const rows = await db
    .selectFrom("budgets")
    .selectAll()
    .where("owner_id", "=", userId)
    .orderBy("created_at", "asc")
    .execute();

  return parseRows(rows, budgetRowSchema, toBudget);
}

export async function createBudget(db: AppDb, userId: string, budget: BudgetCreate) {
  const row = await db
    .insertInto("budgets")
    .values(fromBudget({ budget, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseBudgetRow(row, "Inserted budget failed validation");
}

export async function updateBudget(
  db: AppDb,
  userId: string,
  categoryId: string,
  patch: BudgetPatch,
) {
  const row = await db
    .updateTable("budgets")
    .set(budgetPatchToRow(patch))
    .where("category_id", "=", categoryId)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return parseBudgetRow(row, "Updated budget failed validation");
}

export async function deleteBudget(db: AppDb, userId: string, categoryId: string) {
  const row = await db
    .deleteFrom("budgets")
    .where("category_id", "=", categoryId)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}
