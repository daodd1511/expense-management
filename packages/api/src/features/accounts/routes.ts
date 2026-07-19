import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import { accountCreateSchema, accountPatchSchema, accountReorderSchema } from "./schema";
import { z } from "zod";

export type AccountsEnv = AuthEnv;

export const accountsRouter = new Hono<AccountsEnv>();

accountsRouter.get("/", controller.listAccounts);
accountsRouter.post(
  "/",
  zValidator("json", accountCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const account = await controller.createAccount(c.get("userId"), c.req.valid("json"));
    return c.json({ data: account }, 201);
  },
);
accountsRouter.put(
  "/order",
  zValidator("json", accountReorderSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    await controller.reorderAccounts(c.get("userId"), c.req.valid("json"));
    return c.json({ ok: true });
  },
);
accountsRouter.patch(
  "/:id",
  zValidator("json", accountPatchSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const account = await controller.updateAccount(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
    );
    return c.json({ data: account });
  },
);
accountsRouter.delete("/:id", controller.archiveAccount);
