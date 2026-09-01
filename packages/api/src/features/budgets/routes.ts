import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import { budgetCreateSchema, budgetPatchSchema } from "./schema";

export const budgetsRouter = new Hono<AuthEnv>();

budgetsRouter.get("/", controller.listBudgets);
budgetsRouter.post(
  "/",
  zValidator("json", budgetCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.createBudget(c.get("db"), c.get("userId"), c.req.valid("json"));
    return c.json({ data }, 201);
  },
);
budgetsRouter.patch(
  "/:categoryId",
  zValidator("json", budgetPatchSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.updateBudget(
      c.get("db"),
      c.get("userId"),
      c.req.param("categoryId"),
      c.req.valid("json"),
    );
    return c.json({ data });
  },
);
budgetsRouter.delete("/:categoryId", controller.deleteBudget);
