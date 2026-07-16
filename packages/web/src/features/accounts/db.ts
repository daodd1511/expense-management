import { z } from "zod";
import type { Account } from "@/core/types";
import { apiJson } from "@/core/api";
import { accountSchema, type AccountCreate } from "@wallet/shared";

const accountsResponseSchema = z.object({
  data: z.array(accountSchema),
});

const accountResponseSchema = z.object({
  data: accountSchema,
});

const okResponseSchema = z.object({
  ok: z.literal(true),
});

export async function fetchAccounts(): Promise<Account[]> {
  const response = await apiJson("/accounts", accountsResponseSchema);
  return response.data;
}

export async function insertAccount(account: AccountCreate): Promise<void> {
  await apiJson("/accounts", accountResponseSchema, {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export async function patchAccount(id: string, patch: Partial<AccountCreate>): Promise<void> {
  await apiJson(`/accounts/${id}`, accountResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function archiveAccount(id: string): Promise<void> {
  await apiJson(`/accounts/${id}`, okResponseSchema, {
    method: "DELETE",
  });
}

export async function reorderAccounts(accountIds: readonly string[]): Promise<void> {
  await apiJson("/accounts/order", okResponseSchema, {
    method: "PUT",
    body: JSON.stringify({ accountIds }),
  });
}
