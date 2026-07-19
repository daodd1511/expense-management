import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import {
  archiveAccount,
  fetchAccounts,
  insertAccount,
  patchAccount,
  reorderAccounts,
} from "@/features/accounts/db";
import { invalidateAccountDependentQueries } from "@/core/query-invalidation";
import type { Account } from "@/core/types";
import type { AccountCreate } from "@wallet/shared";

function applyAccountOrder(accounts: Account[] | undefined, accountIds: readonly string[]) {
  if (!accounts || accounts.length !== accountIds.length) return accounts;

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const reordered = accountIds.map((id) => accountById.get(id));
  if (!reordered.every((account): account is Account => account !== undefined)) return accounts;

  return reordered.map((account, displayOrder) => ({ ...account, displayOrder }));
}

export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
  });
}

/** Account id → Account lookup, memoized over the current accounts list. */
export function useAccountLookup(): (id: string | null | undefined) => Account | undefined {
  const { data: accounts = [] } = useAccounts();
  return useMemo(() => {
    const map = new Map(accounts.map((account) => [account.id, account]));
    return (id: string | null | undefined) => (id ? map.get(id) : undefined);
  }, [accounts]);
}

export function useAddAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (account: AccountCreate) => insertAccount(account),
    onSuccess: () => invalidateAccountDependentQueries(qc, user?.id),
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccountCreate> }) =>
      patchAccount(id, patch),
    onSuccess: () => invalidateAccountDependentQueries(qc, user?.id),
  });
}

export function useDeleteAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onSuccess: () => invalidateAccountDependentQueries(qc, user?.id),
  });
}

export function useReorderAccounts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["accounts", user?.id] as const;

  return useMutation({
    mutationFn: (accountIds: string[]) => reorderAccounts(accountIds),
    onMutate: async (accountIds) => {
      await qc.cancelQueries({ queryKey });
      const previousAccounts = qc.getQueryData<Account[]>(queryKey);
      qc.setQueryData(queryKey, applyAccountOrder(previousAccounts, accountIds));
      return { previousAccounts };
    },
    onError: (_error, _accountIds, context) => {
      if (context?.previousAccounts) {
        qc.setQueryData(queryKey, context.previousAccounts);
      }
    },
    onSettled: () => invalidateAccountDependentQueries(qc, user?.id),
  });
}
