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
import { getSupabase } from "../../config/supabase";
import { ApiError } from "../../middleware/error";
import { parseRows } from "../../lib/response";

function parseAccountRow(data: unknown, message: string): Account {
  const result = accountRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toAccount(result.data);
}

export async function listActiveAccounts(userId: string): Promise<Account[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", userId)
    .eq("archived", false)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return parseRows(data, accountRowSchema, toAccount);
}

export async function listUserTransactions(userId: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("transactions").select("*").eq("owner_id", userId);

  if (error) {
    throw error;
  }

  return parseRows(data, transactionRowSchema, toTransaction);
}

export async function createAccount(userId: string, account: AccountCreate): Promise<Account> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .insert(fromAccount({ account, ownerId: userId }))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return parseAccountRow(data, "Inserted account failed validation");
}

export async function updateAccount(
  userId: string,
  id: string,
  patch: AccountPatch,
): Promise<Account | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .update(accountPatchToRow(patch))
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseAccountRow(data, "Updated account failed validation");
}

export async function archiveAccount(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .update({ archived: true })
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function reorderAccounts(userId: string, input: AccountReorder): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("reorder_accounts", {
    p_owner_id: userId,
    p_account_ids: input.accountIds,
  });

  if (error) {
    throw error;
  }
}
