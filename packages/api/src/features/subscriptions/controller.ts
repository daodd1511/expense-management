import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import * as service from "./service";

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error("Missing route param: id");
  }

  return id;
}

export async function listSubscriptions(c: Context<AuthEnv>) {
  return c.json({ data: await service.listSubscriptions(c.get("userId")) });
}

export async function createSubscription(
  userId: string,
  input: Parameters<typeof service.createSubscription>[1],
) {
  return service.createSubscription(userId, input);
}

export async function logSubscription(userId: string, id: string | undefined, today: string) {
  return service.logSubscription(userId, requireId(id), today);
}

export async function updateSubscription(
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateSubscription>[2],
) {
  return service.updateSubscription(userId, requireId(id), input);
}

export async function deleteSubscription(c: Context<AuthEnv>) {
  await service.deleteSubscription(c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}
