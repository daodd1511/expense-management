import {
  budgetPatchToRow,
  budgetRowSchema,
  fromBudget,
  toBudget,
  type Budget,
  type BudgetCreate,
  type BudgetPatch,
} from "@wallet/shared";
import { getSupabase } from "../../config/supabase";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

function parseBudgetRow(data: unknown, message: string): Budget {
  const result = budgetRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toBudget(result.data);
}

export async function listBudgets(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, budgetRowSchema, toBudget);
}

export async function createBudget(userId: string, budget: BudgetCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budgets")
    .insert(fromBudget({ budget, ownerId: userId }))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return parseBudgetRow(data, "Inserted budget failed validation");
}

export async function updateBudget(userId: string, categoryId: string, patch: BudgetPatch) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budgets")
    .update(budgetPatchToRow(patch))
    .eq("category_id", categoryId)
    .eq("owner_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseBudgetRow(data, "Updated budget failed validation");
}

export async function deleteBudget(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("category_id", categoryId)
    .eq("owner_id", userId)
    .select("id");

  if (error) {
    throw error;
  }

  return Boolean(data && data.length > 0);
}
