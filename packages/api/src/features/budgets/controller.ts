import type { BudgetCreate, BudgetPatch } from "@wallet/shared";
import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import * as service from "./service";

function requireCategoryId(categoryId: string | undefined) {
  if (!categoryId) {
    throw new Error("Missing route param: categoryId");
  }

  return categoryId;
}

export async function listBudgets(c: Context<AuthEnv>) {
  const data = await service.listBudgets(c.get("userId"));
  return c.json({ data });
}

export async function createBudget(userId: string, input: BudgetCreate) {
  return service.createBudget(userId, input);
}

export async function updateBudget(
  userId: string,
  categoryId: string | undefined,
  input: BudgetPatch,
) {
  return service.updateBudget(userId, requireCategoryId(categoryId), input);
}

export async function deleteBudget(c: Context<AuthEnv>) {
  await service.deleteBudget(c.get("userId"), requireCategoryId(c.req.param("categoryId")));
  return c.json({ ok: true });
}
