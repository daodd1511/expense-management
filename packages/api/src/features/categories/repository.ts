import {
  categoryPatchToRow,
  categoryRowSchema,
  fromCategory,
  toCategory,
  type Category,
  type CategoryCreate,
  type CategoryPatch,
  type Lang,
} from "@wallet/shared";
import { getSupabase } from "../../config/supabase";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

const DEFAULT_LOCALE: Lang = "vi";

export type ParentCandidate = {
  id: string;
  type: string;
  parent_id: string | null;
  owner_id: string | null;
};

export type OwnedCategory = ParentCandidate;

function parseCategoryRow(data: unknown, message: string): Category {
  const result = categoryRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toCategory(result.data);
}

export async function listCategories(userId: string, locale: Lang = DEFAULT_LOCALE) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("*, category_translations(name, locale)")
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .eq("category_translations.locale", locale)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const localized = (data ?? []).map((row) => {
    const { category_translations, ...rest } = row as typeof row & {
      category_translations: { name: string; locale: string }[] | null;
    };
    const translated = rest.owner_id === null ? category_translations?.[0]?.name : undefined;
    return { ...rest, name: translated ?? rest.name };
  });

  return parseRows(localized, categoryRowSchema, toCategory);
}

export async function loadParentCandidate(
  parentId: string,
  userId: string,
): Promise<ParentCandidate | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, type, parent_id, owner_id")
    .eq("id", parentId)
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ParentCandidate | null) ?? null;
}

export async function createCategory(userId: string, category: CategoryCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert(fromCategory({ category, ownerId: userId }))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return parseCategoryRow(data, "Inserted category failed validation");
}

export async function loadOwnedCategory(id: string): Promise<OwnedCategory | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, type, parent_id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OwnedCategory | null) ?? null;
}

export async function countChildren(categoryId: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", categoryId);

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

export async function listBudgetedCategoryIds(userId: string, categoryIds: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budgets")
    .select("category_id")
    .in("category_id", categoryIds)
    .eq("owner_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((budget) => budget.category_id));
}

export async function updateCategory(userId: string, id: string, patch: CategoryPatch) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .update(categoryPatchToRow(patch))
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseCategoryRow(data, "Updated category failed validation");
}

export async function clearTransactionsCategory(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from("transactions")
    .update({ category_id: null })
    .eq("category_id", categoryId)
    .eq("owner_id", userId);

  if (result.error) {
    throw result.error;
  }
}

export async function clearSubscriptionsCategory(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from("subscriptions")
    .update({ category_id: null })
    .eq("category_id", categoryId)
    .eq("owner_id", userId);

  if (result.error) {
    throw result.error;
  }
}

export async function deleteBudget(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from("budgets")
    .delete()
    .eq("category_id", categoryId)
    .eq("owner_id", userId);

  if (result.error) {
    throw result.error;
  }
}

export async function deleteCategory(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
