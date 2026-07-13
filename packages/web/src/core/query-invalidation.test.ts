import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateAccountDependentQueries,
  invalidateCategoryDependentQueries,
  invalidateSubscriptionLogDependentQueries,
  invalidateTransactionDependentQueries,
} from "./query-invalidation";

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient;
}

describe("query invalidation helpers", () => {
  it("invalidates transaction dependents together", async () => {
    const queryClient = createQueryClientMock();

    await invalidateTransactionDependentQueries(queryClient, "user-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["transactions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["accounts", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reports", "user-1"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["analytics", "balance-trend", "user-1"],
    });
  });

  it("invalidates account dependents together", async () => {
    const queryClient = createQueryClientMock();

    await invalidateAccountDependentQueries(queryClient, "user-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["accounts", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["transactions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["analytics", "balance-trend", "user-1"],
    });
  });

  it("invalidates category dependents together", async () => {
    const queryClient = createQueryClientMock();

    await invalidateCategoryDependentQueries(queryClient, "user-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["categories", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["transactions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["subscriptions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["budgets", "user-1"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reports", "user-1"] });
  });

  it("invalidates subscription log dependents together", async () => {
    const queryClient = createQueryClientMock();

    await invalidateSubscriptionLogDependentQueries(queryClient, "user-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["subscriptions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["transactions", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["accounts", "user-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reports", "user-1"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["analytics", "balance-trend", "user-1"],
    });
  });
});
