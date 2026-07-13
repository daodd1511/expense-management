import {
  favoriteRowSchema,
  fromFavorite,
  toFavorite,
  type Favorite,
  type FavoriteCreate,
} from "@wallet/shared";
import { getSupabase } from "../../config/supabase";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

function parseFavoriteRow(data: unknown, message: string): Favorite {
  const result = favoriteRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toFavorite(result.data);
}

export async function listFavorites(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("category_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, favoriteRowSchema, toFavorite);
}

export async function findFavorite(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("category_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? parseFavoriteRow(data, "Existing favorite failed validation") : null;
}

export async function createFavorite(userId: string, input: FavoriteCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("category_favorites")
    .insert(fromFavorite({ categoryId: input.categoryId, userId }))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return parseFavoriteRow(data, "Inserted favorite failed validation");
}

export async function deleteFavorite(userId: string, categoryId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("category_favorites")
    .delete()
    .eq("category_id", categoryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
