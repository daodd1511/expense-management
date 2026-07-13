import type { AccountCreate, AccountPatch } from "@wallet/shared";
import type { Context } from "hono";
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
  const accounts = await service.listAccounts(userId);
  return c.json({ data: accounts });
}

export async function createAccount(userId: string, input: AccountCreate) {
  return service.createAccount(userId, input);
}

export async function updateAccount(userId: string, id: string | undefined, input: AccountPatch) {
  return service.updateAccount(userId, requireId(id), input);
}

export async function archiveAccount(c: Context<AccountsEnv>) {
  const userId = c.get("userId");
  await service.archiveAccount(userId, requireId(c.req.param("id")));
  return c.json({ ok: true });
}
