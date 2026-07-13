import type { FavoriteCreate } from "@wallet/shared";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listFavorites(userId: string) {
  return repository.listFavorites(userId);
}

export async function createFavorite(userId: string, input: FavoriteCreate) {
  const existing = await repository.findFavorite(userId, input.categoryId);
  if (existing) {
    return { favorite: existing, created: false as const };
  }

  const favorite = await repository.createFavorite(userId, input);
  return { favorite, created: true as const };
}

export async function deleteFavorite(userId: string, categoryId: string) {
  const deleted = await repository.deleteFavorite(userId, categoryId);
  if (!deleted) {
    throw new ApiError(404, "Favorite not found");
  }
}
