import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { FinancialPositionResponse } from "@wallet/shared";
import { reportQueryKeys, useFinancialPosition } from "./queries";

const reportDbMocks = vi.hoisted(() => ({ fetchFinancialPosition: vi.fn() }));

vi.mock("@/features/auth/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...reportDbMocks };
});

const RESPONSE: FinancialPositionResponse = {
  data: {
    range: { from: "2026-07-01", to: "2026-07-31" },
    opening: {
      accountTotal: 2_000_000,
      lendingOutstanding: 1_000_000,
      borrowingOutstanding: 0,
      netWorth: 3_000_000,
    },
    closing: {
      accountTotal: 2_400_000,
      lendingOutstanding: 600_000,
      borrowingOutstanding: 0,
      netWorth: 3_000_000,
    },
    income: 0,
    expense: 0,
    surplus: 0,
    loanCashFlow: {
      lent: 0,
      borrowed: 0,
      lendingRepaymentsReceived: 400_000,
      borrowingRepaymentsPaid: 0,
      net: 400_000,
    },
    balanceAdjustments: 0,
    writeOffs: 0,
    forgiveness: 0,
    openingLoanAdjustments: { lending: 0, borrowing: 0 },
    reconciliation: {
      accountTotal: { expected: 2_400_000, actual: 2_400_000, matches: true },
      netWorth: { expected: 3_000_000, actual: 3_000_000, matches: true },
    },
  },
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("report queries", () => {
  it("fetches Financial Position with a user-scoped range key", async () => {
    reportDbMocks.fetchFinancialPosition.mockResolvedValueOnce(RESPONSE);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);
    const range = { from: "2026-07-01", to: "2026-07-31" };

    const { result } = renderHook(() => useFinancialPosition(range), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(RESPONSE));
    expect(reportDbMocks.fetchFinancialPosition).toHaveBeenCalledWith(range);
    expect(queryClient.getQueryData(reportQueryKeys.financialPosition("user-1", range))).toEqual(
      RESPONSE,
    );
  });
});
