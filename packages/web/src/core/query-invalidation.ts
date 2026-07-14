import type { QueryClient } from "@tanstack/react-query";

type UserId = string | undefined;

function invalidateUserQuery(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return queryClient.invalidateQueries({ queryKey });
}

export function invalidateTransactionDependentQueries(queryClient: QueryClient, userId: UserId) {
  return Promise.all([
    invalidateUserQuery(queryClient, ["transactions", userId]),
    invalidateUserQuery(queryClient, ["accounts", userId]),
    invalidateUserQuery(queryClient, ["reports", userId]),
    invalidateUserQuery(queryClient, ["analytics", "balance-trend", userId]),
  ]);
}

export function invalidateAccountDependentQueries(queryClient: QueryClient, userId: UserId) {
  return Promise.all([
    invalidateUserQuery(queryClient, ["accounts", userId]),
    invalidateUserQuery(queryClient, ["transactions", userId]),
    invalidateUserQuery(queryClient, ["analytics", "balance-trend", userId]),
  ]);
}

export function invalidateCategoryDependentQueries(queryClient: QueryClient, userId: UserId) {
  return Promise.all([
    invalidateUserQuery(queryClient, ["categories", userId]),
    invalidateUserQuery(queryClient, ["transactions", userId]),
    invalidateUserQuery(queryClient, ["subscriptions", userId]),
    invalidateUserQuery(queryClient, ["budgets", userId]),
    invalidateUserQuery(queryClient, ["reports", userId]),
  ]);
}

export function invalidateSubscriptionLogDependentQueries(
  queryClient: QueryClient,
  userId: UserId,
) {
  return Promise.all([
    invalidateUserQuery(queryClient, ["subscriptions", userId]),
    invalidateTransactionDependentQueries(queryClient, userId),
  ]);
}

export function invalidateLoanDependentQueries(queryClient: QueryClient, userId: UserId) {
  return Promise.all([
    invalidateUserQuery(queryClient, ["loans", userId]),
    invalidateUserQuery(queryClient, ["transactions", userId]),
    invalidateUserQuery(queryClient, ["accounts", userId]),
    invalidateUserQuery(queryClient, ["reports", userId]),
    invalidateUserQuery(queryClient, ["analytics", "dashboard-summary", userId]),
    invalidateUserQuery(queryClient, ["analytics", "balance-trend", userId]),
    invalidateUserQuery(queryClient, ["analytics", "net-worth-trend", userId]),
  ]);
}
