import {
  categoryRowSchema,
  toCategory,
  toTransaction,
  transactionRowSchema,
  type Category,
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
