import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import { archiveAccount, fetchAccounts, insertAccount, patchAccount } from "@/features/accounts/db";
import { invalidateAccountDependentQueries } from "@/core/query-invalidation";
import type { Account } from "@/core/types";

type AccountInput = Omit<Account, "id" | "balance">;

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
    mutationFn: (account: AccountInput) => insertAccount(account),
    onSuccess: () => invalidateAccountDependentQueries(qc, user?.id),
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccountInput> }) =>
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
