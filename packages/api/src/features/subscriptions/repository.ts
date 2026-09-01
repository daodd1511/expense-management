import {
  fromSubscription,
  subscriptionPatchToRow,
  subscriptionRowSchema,
  toSubscription,
  transactionRowSchema,
  type Database,
  type Subscription,
} from "@wallet/shared";
import { sql } from "kysely";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

type LogSubscriptionRpcRow = Database["public"]["Functions"]["log_subscription"]["Returns"][number];

function parseSubscriptionRow(data: unknown, message: string): Subscription {
  const result = subscriptionRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toSubscription(result.data);
}

export async function listSubscriptions(db: AppDb, userId: string) {
  const rows = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("owner_id", "=", userId)
    .orderBy("created_at", "asc")
    .execute();

  return parseRows(rows, subscriptionRowSchema, toSubscription);
}

export async function referencesAreAccessible(
  db: AppDb,
  userId: string,
  references: { accountId?: string; categoryId?: string | null },
) {
  if (references.accountId !== undefined) {
    const account = await db
      .selectFrom("accounts")
      .select("id")
      .where("id", "=", references.accountId)
      .where("owner_id", "=", userId)
      .executeTakeFirst();
    if (!account) return false;
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

  return true;
}

export async function createSubscription(
  db: AppDb,
  userId: string,
  subscription: Omit<Subscription, "id">,
) {
  const row = await db
    .insertInto("subscriptions")
    .values(fromSubscription({ subscription, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseSubscriptionRow(row, "Inserted subscription failed validation");
}

export async function loadSubscription(db: AppDb, userId: string, id: string) {
  const row = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .executeTakeFirst();

  return row ? parseSubscriptionRow(row, "Stored subscription failed validation") : null;
}

export async function loadSubscriptionSchedule(db: AppDb, userId: string, id: string) {
  return db
    .selectFrom("subscriptions")
    .select(["day_of_month", "month_of_year", "cadence"])
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .executeTakeFirst();
}

export async function logSubscription(
  db: AppDb,
  params: {
    userId: string;
    subscription: Subscription;
    today: string;
    nextDueDate: string;
  },
) {
  const result = await sql<LogSubscriptionRpcRow>`select * from public.log_subscription(
    ${params.userId}::uuid,
    ${params.subscription.id}::uuid,
    ${params.subscription.type}::text,
    ${params.subscription.amount}::numeric,
    ${params.subscription.categoryId ?? null}::uuid,
    ${params.subscription.accountId}::uuid,
    ${params.subscription.name}::text,
    ${params.subscription.note ?? null}::text,
    ${params.today}::date,
    ${params.nextDueDate}::date
  )`.execute(db);
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const txRow = transactionRowSchema.safeParse({
    id: row.tx_id,
    owner_id: row.tx_owner_id,
    type: row.tx_type,
    amount: row.tx_amount,
    category_id: row.tx_category_id,
    account_id: row.tx_account_id,
    to_account_id: row.tx_to_account_id,
    merchant: row.tx_merchant,
    note: row.tx_note,
    tx_date: row.tx_tx_date,
    tx_time: null,
    receipt_url: row.tx_receipt_url,
    subscription_id: row.tx_subscription_id,
    created_at: row.tx_created_at,
  });
  if (!txRow.success) {
    throw new ApiError(500, "Logged transaction failed validation", txRow.error.flatten());
  }

  return parseSubscriptionRow(
    {
      id: row.sub_id,
      owner_id: row.sub_owner_id,
      name: row.sub_name,
      amount: row.sub_amount,
      type: row.sub_type,
      category_id: row.sub_category_id,
      account_id: row.sub_account_id,
      cadence: row.sub_cadence,
      day_of_month: row.sub_day_of_month,
      month_of_year: row.sub_month_of_year,
      next_due_date: row.sub_next_due_date,
      note: row.sub_note,
      active: row.sub_active,
      created_at: row.sub_created_at,
    },
    "Updated subscription failed validation",
  );
}

export async function updateSubscription(
  db: AppDb,
  userId: string,
  id: string,
  row: ReturnType<typeof subscriptionPatchToRow> & { next_due_date?: string },
) {
  const updated = await db
    .updateTable("subscriptions")
    .set(row)
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  return updated ? parseSubscriptionRow(updated, "Updated subscription failed validation") : null;
}

export async function deleteSubscription(db: AppDb, userId: string, id: string) {
  const row = await db
    .deleteFrom("subscriptions")
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

export { subscriptionPatchToRow };
