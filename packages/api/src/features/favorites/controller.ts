import type { FavoriteCreate } from "@wallet/shared";
import type { Context } from "hono";
import type { AppDb } from "../../db/database";
import type { AuthEnv } from "../../middleware/auth";
import * as service from "./service";

function requireCategoryId(categoryId: string | undefined) {
  if (!categoryId) {
    throw new Error("Missing route param: categoryId");
  }

  return categoryId;
}

export async function listFavorites(c: Context<AuthEnv>) {
  const data = await service.listFavorites(c.get("db"), c.get("userId"));
  return c.json({ data });
}

export async function createFavorite(db: AppDb, userId: string, input: FavoriteCreate) {
  return service.createFavorite(db, userId, input);
}

export async function deleteFavorite(c: Context<AuthEnv>) {
  await service.deleteFavorite(
    c.get("db"),
    c.get("userId"),
    requireCategoryId(c.req.param("categoryId")),
  );
  return c.json({ ok: true });
}
