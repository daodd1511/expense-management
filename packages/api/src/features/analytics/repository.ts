import {
  accountRowSchema,
  loanEventRowSchema,
  loanRowSchema,
  toAccount,
  toLoan,
  toLoanEvent,
  toTransaction,
  transactionRowSchema,
  type Account,
  type Loan,
  type LoanEvent,
  type Transaction,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";

export async function listActiveAccounts(db: AppDb, userId: string): Promise<Account[]> {
  const rows = await db
    .selectFrom("accounts")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("archived", "=", false)
    .execute();

  return parseRows(rows, accountRowSchema, toAccount);
}

export async function listTransactions(db: AppDb, userId: string): Promise<Transaction[]> {
  const rows = await db
    .selectFrom("transactions")
    .selectAll()
    .where("owner_id", "=", userId)
    .execute();

  return parseRows(rows, transactionRowSchema, toTransaction);
}

/** Every loan (full row, not just direction — the dashboard's overdue count needs each
 * loan's own dueDate) plus its full event history. */
export async function listLoansWithEvents(
  db: AppDb,
  userId: string,
): Promise<{ loan: Loan; events: LoanEvent[] }[]> {
  const loanRows = await db
    .selectFrom("loans")
    .selectAll()
    .where("owner_id", "=", userId)
    .execute();

  const loans = parseRows(loanRows, loanRowSchema, toLoan);
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

  return loans.map((loan) => ({ loan, events: eventsByLoanId.get(loan.id) ?? [] }));
}
