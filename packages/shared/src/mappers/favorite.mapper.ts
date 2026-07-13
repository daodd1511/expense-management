import type { Favorite } from "../models";
import type { FavoriteRow } from "../dtos";

export function toFavorite(row: FavoriteRow): Favorite {
  return { categoryId: row.category_id };
}

export function fromFavorite(params: { categoryId: string; userId: string }) {
  const { categoryId, userId } = params;
  return {
    user_id: userId,
    category_id: categoryId,
  };
}
