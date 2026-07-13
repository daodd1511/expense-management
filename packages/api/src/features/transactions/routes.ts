import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import {
  transactionBulkDeleteSchema,
  transactionCreateSchema,
  transactionPatchSchema,
} from "./schema";

export const transactionsRouter = new Hono<AuthEnv>();

transactionsRouter.get("/", controller.listTransactions);
transactionsRouter.post(
  "/",
  zValidator("json", transactionCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.createTransaction(c.get("userId"), c.req.valid("json"));
    return c.json({ data }, 201);
  },
);
transactionsRouter.patch(
  "/:id",
  zValidator("json", transactionPatchSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.updateTransaction(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
    );
    return c.json({ data });
  },
);
transactionsRouter.delete(
  "/",
  zValidator("json", transactionBulkDeleteSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.deleteTransactions(c.get("userId"), c.req.valid("json"));
    return c.json({ data });
  },
);
transactionsRouter.delete("/:id", controller.deleteTransaction);
