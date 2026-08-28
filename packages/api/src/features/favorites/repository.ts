import {
  favoriteRowSchema,
  fromFavorite,
  toFavorite,
  type Favorite,
  type FavoriteCreate,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

function parseFavoriteRow(data: unknown, message: string): Favorite {
  const result = favoriteRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toFavorite(result.data);
}

export async function listFavorites(db: AppDb, userId: string) {
  const rows = await db
    .selectFrom("category_favorites")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("created_at", "asc")
    .execute();

  return parseRows(rows, favoriteRowSchema, toFavorite);
}

export async function findFavorite(db: AppDb, userId: string, categoryId: string) {
  const row = await db
    .selectFrom("category_favorites")
    .selectAll()
    .where("user_id", "=", userId)
    .where("category_id", "=", categoryId)
    .executeTakeFirst();

  return row ? parseFavoriteRow(row, "Existing favorite failed validation") : null;
}

export async function isCategoryAccessible(db: AppDb, userId: string, categoryId: string) {
  const row = await db
    .selectFrom("categories")
    .select("id")
    .where("id", "=", categoryId)
    .where((eb) => eb.or([eb("owner_id", "=", userId), eb("owner_id", "is", null)]))
    .executeTakeFirst();

  return Boolean(row);
}

export async function createFavorite(db: AppDb, userId: string, input: FavoriteCreate) {
  const row = await db
    .insertInto("category_favorites")
    .values(fromFavorite({ categoryId: input.categoryId, userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseFavoriteRow(row, "Inserted favorite failed validation");
}

export async function deleteFavorite(db: AppDb, userId: string, categoryId: string) {
  const row = await db
    .deleteFrom("category_favorites")
    .where("category_id", "=", categoryId)
    .where("user_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}
