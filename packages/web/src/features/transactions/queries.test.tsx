import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/core/types";
import {
  useAddTransaction,
  useTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
} from "./queries";

const transactionDbMocks = vi.hoisted(() => ({
  fetchTransactions: vi.fn(),
  insertTransaction: vi.fn(),
  patchTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    fetchTransactions: transactionDbMocks.fetchTransactions,
    insertTransaction: transactionDbMocks.insertTransaction,
    patchTransaction: transactionDbMocks.patchTransaction,
    deleteTransaction: transactionDbMocks.deleteTransaction,
  };
});

const EXISTING_TRANSACTION: Transaction = {
  id: "tx-1",
  type: "expense",
  amount: 120000,
  categoryId: "food",
  accountId: "cash",
  toAccountId: null,
  merchant: "Lunch",
  note: undefined,
  date: "2026-07-05T10:00:00.000Z",
  receipt: null,
  subscriptionId: null,
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("transaction optimistic mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the selected month with a month-scoped query key", async () => {
    transactionDbMocks.fetchTransactions.mockResolvedValueOnce([EXISTING_TRANSACTION]);
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTransactions("2026-07"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([EXISTING_TRANSACTION]));
    expect(transactionDbMocks.fetchTransactions).toHaveBeenCalledWith("2026-07");
    expect(queryClient.getQueryData(["transactions", "user-1", "2026-07"])).toEqual([
      EXISTING_TRANSACTION,
    ]);
  });

  it("optimistically adds a transaction and rolls back on error", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const deferred = createDeferred<void>();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    transactionDbMocks.insertTransaction.mockReturnValueOnce(deferred.promise);
    queryClient.setQueryData(["transactions", "user-1", "2026-07"], [EXISTING_TRANSACTION]);

    const { result } = renderHook(() => useAddTransaction("2026-07"), { wrapper });

    act(() => {
      result.current.mutate({
        type: "expense",
        amount: 45000,
        categoryId: "food",
        accountId: "cash",
        toAccountId: null,
        merchant: "Coffee",
        note: undefined,
        date: "2026-07-05",
        receipt: null,
        subscriptionId: null,
      });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Transaction[]>(["transactions", "user-1", "2026-07"]),
      ).toEqual([
        expect.objectContaining({
          id: expect.stringMatching(/^temp-/),
          merchant: "Coffee",
          amount: 45000,
        }),
        EXISTING_TRANSACTION,
      ]),
    );

    deferred.reject(new Error("offline"));

    await waitFor(() =>
      expect(queryClient.getQueryData(["transactions", "user-1", "2026-07"])).toEqual([
        EXISTING_TRANSACTION,
      ]),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reports", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["analytics", "balance-trend", "user-1"],
    });
  });

  it("optimistically patches a transaction in the cache", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const deferred = createDeferred<void>();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    transactionDbMocks.patchTransaction.mockReturnValueOnce(deferred.promise);
    queryClient.setQueryData(["transactions", "user-1", "2026-07"], [EXISTING_TRANSACTION]);

    const { result } = renderHook(() => useUpdateTransaction("2026-07"), { wrapper });

    act(() => {
      result.current.mutate({
        id: "tx-1",
        patch: { merchant: "Brunch", amount: 160000 },
      });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Transaction[]>(["transactions", "user-1", "2026-07"]),
      ).toEqual([
        expect.objectContaining({
          id: "tx-1",
          merchant: "Brunch",
          amount: 160000,
        }),
      ]),
    );

    deferred.resolve(undefined);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analytics", "balance-trend", "user-1"],
      }),
    );
  });

  it("optimistically removes a transaction and restores it on error", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const deferred = createDeferred<void>();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    transactionDbMocks.deleteTransaction.mockReturnValueOnce(deferred.promise);
    queryClient.setQueryData(["transactions", "user-1", "2026-07"], [EXISTING_TRANSACTION]);

    const { result } = renderHook(() => useDeleteTransaction("2026-07"), { wrapper });

    act(() => {
      result.current.mutate("tx-1");
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Transaction[]>(["transactions", "user-1", "2026-07"]),
      ).toEqual([]),
    );

    deferred.reject(new Error("offline"));

    await waitFor(() =>
      expect(queryClient.getQueryData(["transactions", "user-1", "2026-07"])).toEqual([
        EXISTING_TRANSACTION,
      ]),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reports", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["analytics", "balance-trend", "user-1"],
    });
  });
});
