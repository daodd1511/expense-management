import type { AccountCreate, AccountPatch, AccountReorder } from "@wallet/shared";
import type { Context } from "hono";
import type { AppDb } from "../../db/database";
import * as service from "./service";
import type { AccountsEnv } from "./routes";

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error("Missing route param: id");
  }

  return id;
}

export async function listAccounts(c: Context<AccountsEnv>) {
  const userId = c.get("userId");
  const accounts = await service.listAccounts(c.get("db"), userId);
  return c.json({ data: accounts });
}

export async function createAccount(db: AppDb, userId: string, input: AccountCreate) {
  return service.createAccount(db, userId, input);
}

export async function updateAccount(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: AccountPatch,
) {
  return service.updateAccount(db, userId, requireId(id), input);
}

export async function archiveAccount(c: Context<AccountsEnv>) {
  const userId = c.get("userId");
  await service.archiveAccount(c.get("db"), userId, requireId(c.req.param("id")));
  return c.json({ ok: true });
}

export async function reorderAccounts(db: AppDb, userId: string, input: AccountReorder) {
  await service.reorderAccounts(db, userId, input);
}
