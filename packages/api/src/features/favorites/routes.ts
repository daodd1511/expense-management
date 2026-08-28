import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import { favoriteCreateSchema } from "./schema";

export const favoritesRouter = new Hono<AuthEnv>();

favoritesRouter.get("/", controller.listFavorites);
favoritesRouter.post(
  "/",
  zValidator("json", favoriteCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const result = await controller.createFavorite(
      c.get("db"),
      c.get("userId"),
      c.req.valid("json"),
    );
    return c.json({ data: result.favorite }, result.created ? 201 : 200);
  },
);
favoritesRouter.delete("/:categoryId", controller.deleteFavorite);
