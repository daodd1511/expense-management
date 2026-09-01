import type { Context } from "hono";
import type { AppDb } from "../../db/database";
import type { AuthEnv } from "../../middleware/auth";
import * as service from "./service";

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error("Missing route param: id");
  }

  return id;
}

export async function listSubscriptions(c: Context<AuthEnv>) {
  return c.json({ data: await service.listSubscriptions(c.get("db"), c.get("userId")) });
}

export async function createSubscription(
  db: AppDb,
  userId: string,
  input: Parameters<typeof service.createSubscription>[2],
) {
  return service.createSubscription(db, userId, input);
}

export async function logSubscription(
  db: AppDb,
  userId: string,
  id: string | undefined,
  today: string,
) {
  return service.logSubscription(db, userId, requireId(id), today);
}

export async function updateSubscription(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateSubscription>[3],
) {
  return service.updateSubscription(db, userId, requireId(id), input);
}

export async function deleteSubscription(c: Context<AuthEnv>) {
  await service.deleteSubscription(c.get("db"), c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}
