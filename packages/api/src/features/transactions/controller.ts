import type { TransactionBulkDelete, TransactionCreate, TransactionPatch } from "@wallet/shared";
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

export async function listTransactions(c: Context<AuthEnv>) {
  const data = await service.listTransactions(c.get("db"), c.get("userId"), c.req.query("month"));
  return c.json({ data });
}

export async function createTransaction(db: AppDb, userId: string, input: TransactionCreate) {
  return service.createTransaction(db, userId, input);
}

export async function updateTransaction(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: TransactionPatch,
) {
  return service.updateTransaction(db, userId, requireId(id), input);
}

export async function deleteTransactions(db: AppDb, userId: string, input: TransactionBulkDelete) {
  return service.deleteTransactions(db, userId, input.ids);
}

export async function deleteTransaction(c: Context<AuthEnv>) {
  await service.deleteTransaction(c.get("db"), c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}
