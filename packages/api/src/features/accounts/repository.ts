import {
  accountPatchToRow,
  accountRowSchema,
  fromAccount,
  toAccount,
  toTransaction,
  transactionRowSchema,
  type Account,
  type AccountCreate,
  type AccountPatch,
  type AccountReorder,
  type Transaction,
} from "@wallet/shared";
import { sql } from "kysely";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import { parseRows } from "../../lib/response";

function parseAccountRow(data: unknown, message: string): Account {
  const result = accountRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toAccount(result.data);
}

export async function listActiveAccounts(db: AppDb, userId: string): Promise<Account[]> {
  const rows = await db
    .selectFrom("accounts")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("archived", "=", false)
    .orderBy("display_order", "asc")
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .execute();

  return parseRows(rows, accountRowSchema, toAccount);
}

export async function listUserTransactions(db: AppDb, userId: string): Promise<Transaction[]> {
  const rows = await db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", userId)
    .execute();

  return parseRows(rows, transactionRowSchema, toTransaction);
}

export async function createAccount(
  db: AppDb,
  userId: string,
  account: AccountCreate,
): Promise<Account> {
  const row = await db
    .insertInto("accounts")
    .values(fromAccount({ account, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseAccountRow(row, "Inserted account failed validation");
}

export async function updateAccount(
  db: AppDb,
  userId: string,
  id: string,
  patch: AccountPatch,
): Promise<Account | null> {
  const row = await db
    .updateTable("accounts")
    .set(accountPatchToRow(patch))
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return parseAccountRow(row, "Updated account failed validation");
}

export async function archiveAccount(db: AppDb, userId: string, id: string): Promise<boolean> {
  const row = await db
    .updateTable("accounts")
    .set({ archived: true })
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

export async function reorderAccounts(
  db: AppDb,
  userId: string,
  input: AccountReorder,
): Promise<void> {
  await sql`select public.reorder_accounts(${userId}::uuid, ${input.accountIds}::uuid[])`.execute(
    db,
  );
}
