import type { FavoriteCreate } from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listFavorites(db: AppDb, userId: string) {
  return repository.listFavorites(db, userId);
}

export async function createFavorite(db: AppDb, userId: string, input: FavoriteCreate) {
  if (!(await repository.isCategoryAccessible(db, userId, input.categoryId))) {
    throw new ApiError(404, "Category not found");
  }

  const existing = await repository.findFavorite(db, userId, input.categoryId);
  if (existing) {
    return { favorite: existing, created: false as const };
  }

  const favorite = await repository.createFavorite(db, userId, input);
  return { favorite, created: true as const };
}

export async function deleteFavorite(db: AppDb, userId: string, categoryId: string) {
  const deleted = await repository.deleteFavorite(db, userId, categoryId);
  if (!deleted) {
    throw new ApiError(404, "Favorite not found");
  }
}
