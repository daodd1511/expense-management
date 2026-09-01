import {
  categoryRowSchema,
  loanEventRowSchema,
  loanRowSchema,
  toCategory,
  toLoanEvent,
  toTransaction,
  transactionRowSchema,
  type Category,
  type LoanDirection,
  type LoanEvent,
  type Transaction,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";

export async function listReportTransactions(
  db: AppDb,
  userId: string,
  from: string,
  to: string,
): Promise<Transaction[]> {
  const rows = await db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("tx_date", ">=", from)
    .where("tx_date", "<=", to)
    .orderBy("tx_date", "asc")
    .execute();

  return parseRows(rows, transactionRowSchema, toTransaction);
}

/** Every transaction through `to` (no lower bound) — computing an account total at a
 * boundary needs the full history rolled forward from the account's opening balance. */
export async function listTransactionsThroughDate(
  db: AppDb,
  userId: string,
  to: string,
): Promise<Transaction[]> {
  const rows = await db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("tx_date", "<=", to)
    .orderBy("tx_date", "asc")
    .execute();

  return parseRows(rows, transactionRowSchema, toTransaction);
}

export async function listAccountsForPosition(
  db: AppDb,
  userId: string,
): Promise<{ id: string; openingBalance: number }[]> {
  const rows = await db
    .selectFrom("accounts")
    .select(["id", "opening_balance"])
    .where("owner_id", "=", userId)
    .execute();

  return rows.map((row) => ({
    id: row.id,
    openingBalance: row.opening_balance,
  }));
}

/** Every loan's direction plus its full event history — needed to derive lending/
 * borrowing outstanding at both report boundaries and cash flow within the period. */
export async function listLoansWithEventsForPosition(
  db: AppDb,
  userId: string,
): Promise<{ direction: LoanDirection; events: LoanEvent[] }[]> {
  const loanRows = await db
    .selectFrom("loans")
    .select(["id", "direction"])
    .where("owner_id", "=", userId)
    .execute();

  const loans = parseRows(
    loanRows,
    loanRowSchema.pick({ id: true, direction: true }),
    (row) => row,
  );
  if (loans.length === 0) return [];

  const eventRows = await db
    .selectFrom("loan_events")
    .selectAll()
    .where("owner_id", "=", userId)
    .where(
      "loan_id",
      "in",
      loans.map((loan) => loan.id),
    )
    .execute();

  const events = parseRows(eventRows, loanEventRowSchema, toLoanEvent);
  const eventsByLoanId = new Map<string, LoanEvent[]>();
  for (const event of events) {
    const list = eventsByLoanId.get(event.loanId) ?? [];
    list.push(event);
    eventsByLoanId.set(event.loanId, list);
  }

  return loans.map((loan) => ({
    direction: loan.direction,
    events: eventsByLoanId.get(loan.id) ?? [],
  }));
}

/** System "Balance Adjustment" category ids (owner_id null, one per income/expense) —
 * used to separate manual balance corrections from ordinary income/expense/report totals. */
export async function listBalanceAdjustmentCategoryIds(db: AppDb): Promise<Set<string>> {
  const rows = await db
    .selectFrom("categories")
    .select("id")
    .where("owner_id", "is", null)
    .where("is_hidden", "=", true)
    .where("name", "=", "Balance Adjustment")
    .execute();

  return new Set(rows.map((row) => row.id));
}

export async function listReportCategories(
  db: AppDb,
  userId: string,
  categoryIds: string[],
): Promise<Category[]> {
  if (categoryIds.length === 0) {
    return [];
  }

  const rows = await db
    .selectFrom("categories")
    .selectAll()
    .where("id", "in", categoryIds)
    .where((eb) => eb.or([eb("owner_id", "=", userId), eb("owner_id", "is", null)]))
    .orderBy("created_at", "asc")
    .execute();

  return parseRows(rows, categoryRowSchema, toCategory);
}
