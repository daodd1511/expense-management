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
import { getSupabase } from "../../config/supabase";
import { parseRows } from "../../lib/response";

export async function listActiveAccounts(userId: string): Promise<Account[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", userId)
    .eq("archived", false);

  if (error) {
    throw error;
  }

  return parseRows(data, accountRowSchema, toAccount);
}

export async function listTransactions(userId: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("transactions").select("*").eq("owner_id", userId);

  if (error) {
    throw error;
  }

  return parseRows(data, transactionRowSchema, toTransaction);
}

/** Every loan (full row, not just direction — the dashboard's overdue count needs each
 * loan's own dueDate) plus its full event history. */
export async function listLoansWithEvents(
  userId: string,
): Promise<{ loan: Loan; events: LoanEvent[] }[]> {
  const supabase = getSupabase();
  const { data: loanRows, error: loanError } = await supabase
    .from("loans")
    .select("*")
    .eq("owner_id", userId);
  if (loanError) throw loanError;

  const loans = parseRows(loanRows, loanRowSchema, toLoan);
  if (loans.length === 0) return [];

  const { data: eventRows, error: eventError } = await supabase
    .from("loan_events")
    .select("*")
    .eq("owner_id", userId)
    .in(
      "loan_id",
      loans.map((loan) => loan.id),
    );
  if (eventError) throw eventError;

  const events = parseRows(eventRows, loanEventRowSchema, toLoanEvent);
  const eventsByLoanId = new Map<string, LoanEvent[]>();
  for (const event of events) {
    const list = eventsByLoanId.get(event.loanId) ?? [];
    list.push(event);
    eventsByLoanId.set(event.loanId, list);
  }

  return loans.map((loan) => ({ loan, events: eventsByLoanId.get(loan.id) ?? [] }));
}
