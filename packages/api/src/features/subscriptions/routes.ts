import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import {
  logSubscriptionBodySchema,
  subscriptionCreateSchema,
  subscriptionPatchSchema,
} from "./schema";

export const subscriptionsRouter = new Hono<AuthEnv>();

subscriptionsRouter.get("/", controller.listSubscriptions);
subscriptionsRouter.post(
  "/",
  zValidator("json", subscriptionCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.createSubscription(c.get("userId"), c.req.valid("json"));
    return c.json({ data }, 201);
  },
);
subscriptionsRouter.post(
  "/:id/log",
  zValidator("json", logSubscriptionBodySchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.logSubscription(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json").today,
    );
    return c.json({ data });
  },
);
subscriptionsRouter.patch(
  "/:id",
  zValidator("json", subscriptionPatchSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  }),
  async (c) => {
    const data = await controller.updateSubscription(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
    );
    return c.json({ data });
  },
);
subscriptionsRouter.delete("/:id", controller.deleteSubscription);
