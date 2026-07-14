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
import { getSupabase } from "../../config/supabase";
import { parseRows } from "../../lib/response";

export async function listReportTransactions(
  userId: string,
  from: string,
  to: string,
): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner_id", userId)
    .gte("tx_date", from)
    .lte("tx_date", to)
    .order("tx_date", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, transactionRowSchema, toTransaction);
}

/** Every transaction through `to` (no lower bound) — computing an account total at a
 * boundary needs the full history rolled forward from the account's opening balance. */
export async function listTransactionsThroughDate(
  userId: string,
  to: string,
): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner_id", userId)
    .lte("tx_date", to)
    .order("tx_date", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, transactionRowSchema, toTransaction);
}

export async function listAccountsForPosition(
  userId: string,
): Promise<{ id: string; openingBalance: number }[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, opening_balance")
    .eq("owner_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    openingBalance: row.opening_balance as number,
  }));
}

/** Every loan's direction plus its full event history — needed to derive lending/
 * borrowing outstanding at both report boundaries and cash flow within the period. */
export async function listLoansWithEventsForPosition(
  userId: string,
): Promise<{ direction: LoanDirection; events: LoanEvent[] }[]> {
  const supabase = getSupabase();
  const { data: loanRows, error: loanError } = await supabase
    .from("loans")
    .select("id, direction")
    .eq("owner_id", userId);
  if (loanError) throw loanError;

  const loans = parseRows(
    loanRows,
    loanRowSchema.pick({ id: true, direction: true }),
    (row) => row,
  );
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

  return loans.map((loan) => ({
    direction: loan.direction,
    events: eventsByLoanId.get(loan.id) ?? [],
  }));
}

/** System "Balance Adjustment" category ids (owner_id null, one per income/expense) —
 * used to separate manual balance corrections from ordinary income/expense/report totals. */
export async function listBalanceAdjustmentCategoryIds(): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .is("owner_id", null)
    .eq("is_hidden", true)
    .eq("name", "Balance Adjustment");

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function listReportCategories(
  userId: string,
  categoryIds: string[],
): Promise<Category[]> {
  if (categoryIds.length === 0) {
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .in("id", categoryIds)
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, categoryRowSchema, toCategory);
}
