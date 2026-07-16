import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "@/core/types";
import { useReorderAccounts } from "./queries";

const accountDbMocks = vi.hoisted(() => ({
  reorderAccounts: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, reorderAccounts: accountDbMocks.reorderAccounts };
});

const ACCOUNTS: Account[] = [
  {
    id: "account-1",
    name: "Cash",
    kind: "cash",
    openingBalance: 0,
    displayOrder: 0,
  },
  {
    id: "account-2",
    name: "Bank",
    kind: "bank",
    openingBalance: 0,
    displayOrder: 1,
  },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useReorderAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically reorders Accounts and invalidates authoritative data", async () => {
    const deferred = createDeferred<void>();
    accountDbMocks.reorderAccounts.mockReturnValueOnce(deferred.promise);
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(["accounts", "user-1"], ACCOUNTS);
    const { result } = renderHook(() => useReorderAccounts(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.mutate(["account-2", "account-1"]));

    await waitFor(() =>
      expect(queryClient.getQueryData<Account[]>(["accounts", "user-1"])).toEqual([
        expect.objectContaining({ id: "account-2", displayOrder: 0 }),
        expect.objectContaining({ id: "account-1", displayOrder: 1 }),
      ]),
    );
    expect(accountDbMocks.reorderAccounts).toHaveBeenCalledWith(["account-2", "account-1"]);

    deferred.resolve(undefined);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user-1"] }),
    );
  });

  it("restores the previous Account order when persistence fails", async () => {
    const deferred = createDeferred<void>();
    accountDbMocks.reorderAccounts.mockReturnValueOnce(deferred.promise);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["accounts", "user-1"], ACCOUNTS);
    const { result } = renderHook(() => useReorderAccounts(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.mutate(["account-2", "account-1"]));
    await waitFor(() =>
      expect(queryClient.getQueryData<Account[]>(["accounts", "user-1"])?.[0]?.id).toBe(
        "account-2",
      ),
    );

    deferred.reject(new Error("offline"));

    await waitFor(() =>
      expect(queryClient.getQueryData<Account[]>(["accounts", "user-1"])).toEqual(ACCOUNTS),
    );
  });
});
