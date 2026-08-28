import {
  accountRowSchema,
  fromTransaction,
  toTransaction,
  transactionPatchToRow,
  transactionRowSchema,
  type AccountRow,
  type Transaction,
  type TransactionCreate,
  type TransactionPatch,
  type TransactionRow,
} from "@wallet/shared";
import { sql } from "kysely";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

function parseTransactionRow(data: unknown, message: string): Transaction {
  const result = transactionRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toTransaction(result.data);
}

function compareLedgerRows(a: TransactionRow, b: TransactionRow) {
  const dateComparison = a.tx_date.localeCompare(b.tx_date);
  if (dateComparison !== 0) return dateComparison;

  const timeComparison = (a.tx_time ?? a.created_at.slice(11, 16)).localeCompare(
    b.tx_time ?? b.created_at.slice(11, 16),
  );
  if (timeComparison !== 0) return timeComparison;

  const createdAtComparison = a.created_at.localeCompare(b.created_at);
  if (createdAtComparison !== 0) return createdAtComparison;

  return a.id.localeCompare(b.id);
}

export async function listAccountOpeningBalances(db: AppDb, userId: string) {
  const rows = await db.selectFrom("accounts").selectAll().where("owner_id", "=", userId).execute();

  const accounts = parseRows(rows, accountRowSchema, (row: AccountRow) => row);
  return Object.fromEntries(accounts.map((account) => [account.id, account.opening_balance]));
}

export async function listTransactionsForBalance(
  db: AppDb,
  params: { userId: string; throughExclusive?: string },
) {
  let query = db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", params.userId)
    .orderBy("tx_date", "asc")
    .orderBy("tx_time", "asc")
    .orderBy("created_at", "asc")
    .orderBy("id", "asc");

  if (params.throughExclusive !== undefined) {
    query = query.where("tx_date", "<", params.throughExclusive);
  }

  const rows = await query.execute();

  return parseRows(rows, transactionRowSchema, (row) => row)
    .sort(compareLedgerRows)
    .map(toTransaction);
}

export async function referencesAreAccessible(
  db: AppDb,
  userId: string,
  references: {
    accountId?: string;
    toAccountId?: string | null;
    categoryId?: string | null;
    subscriptionId?: string | null;
  },
) {
  const accountIds = [references.accountId, references.toAccountId].filter(
    (id): id is string => typeof id === "string",
  );
  if (accountIds.length > 0) {
    const accounts = await db
      .selectFrom("accounts")
      .select("id")
      .where("id", "in", accountIds)
      .where("owner_id", "=", userId)
      .execute();
    if (new Set(accounts.map((account) => account.id)).size !== new Set(accountIds).size) {
      return false;
    }
  }

  if (references.categoryId !== undefined && references.categoryId !== null) {
    const category = await db
      .selectFrom("categories")
      .select("id")
      .where("id", "=", references.categoryId)
      .where((eb) => eb.or([eb("owner_id", "=", userId), eb("owner_id", "is", null)]))
      .executeTakeFirst();
    if (!category) return false;
  }

  if (references.subscriptionId !== undefined && references.subscriptionId !== null) {
    const subscription = await db
      .selectFrom("subscriptions")
      .select("id")
      .where("id", "=", references.subscriptionId)
      .where("owner_id", "=", userId)
      .executeTakeFirst();
    if (!subscription) return false;
  }

  return true;
}

export async function createTransaction(db: AppDb, userId: string, transaction: TransactionCreate) {
  const row = await db
    .insertInto("transactions")
    .values(fromTransaction({ transaction, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseTransactionRow(row, "Inserted transaction failed validation");
}

export async function createTransferWithFee(
  db: AppDb,
  userId: string,
  transaction: TransactionCreate,
  fee: number,
) {
  const result = await sql<TransactionRow>`select * from public.create_transfer_with_fee(
    ${userId}::uuid,
    ${transaction.amount}::bigint,
    ${transaction.accountId}::uuid,
    ${transaction.toAccountId ?? null}::uuid,
    ${transaction.merchant}::text,
    ${transaction.note ?? null}::text,
    ${transaction.date}::date,
    ${transaction.time ?? null}::time,
    ${transaction.receipt ?? null}::text,
    ${fee}::bigint
  )`.execute(db);

  return parseTransactionRow(result.rows[0], "Inserted transfer failed validation");
}

export async function findLinkedTransferFee(db: AppDb, userId: string, transferId: string) {
  const row = await db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("linked_transfer_id", "=", transferId)
    .executeTakeFirst();

  return row ? parseTransactionRow(row, "Linked fee failed validation") : null;
}

export async function findTransferFeeCategoryId(db: AppDb) {
  const row = await db
    .selectFrom("categories")
    .select("id")
    .where("owner_id", "is", null)
    .where("name", "=", "Transfer Fee")
    .where("type", "=", "expense")
    .executeTakeFirstOrThrow();

  return row.id;
}

export async function createLinkedTransferFee(
  db: AppDb,
  userId: string,
  transaction: Omit<Transaction, "id">,
) {
  const row = await db
    .insertInto("transactions")
    .values(fromTransaction({ transaction, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseTransactionRow(row, "Inserted transfer fee failed validation");
}

/** Rows among `ids` that are loan-linked — generic patch/delete/bulk-delete must reject
 * these (see PLAN.md -> "Mutation Ownership and Atomicity"); only Loans may mutate them. */
export async function listLoanLinkedIds(
  db: AppDb,
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .selectFrom("transactions")
    .select("id")
    .where("owner_id", "=", userId)
    .where("id", "in", ids)
    .where("loan_event_id", "is not", null)
    .execute();

  return rows.map((row) => row.id);
}

export async function updateTransaction(
  db: AppDb,
  userId: string,
  id: string,
  patch: TransactionPatch,
) {
  const row = await db
    .updateTable("transactions")
    .set(transactionPatchToRow(patch))
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return parseTransactionRow(row, "Updated transaction failed validation");
}

export async function deleteTransactions(db: AppDb, userId: string, ids: string[]) {
  if (ids.length === 0) return { deletedIds: [] };

  const rows = await db
    .deleteFrom("transactions")
    .where("id", "in", ids)
    .where("owner_id", "=", userId)
    .returning("id")
    .execute();

  return { deletedIds: rows.map((row) => row.id) };
}

export async function deleteTransaction(db: AppDb, userId: string, id: string) {
  const row = await db
    .deleteFrom("transactions")
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}
