import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary, NetWorthTrendPoint } from "@wallet/shared";
import { dashboardQueryKeys, useDashboardSummary, useNetWorthTrend } from "./queries";

const dashboardDbMocks = vi.hoisted(() => ({
  fetchDashboardSummary: vi.fn(),
  fetchNetWorthTrend: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dashboardDbMocks };
});

const SUMMARY: DashboardSummary = {
  netWorth: {
    accountTotal: 2_400_000,
    lendingOutstanding: 600_000,
    borrowingOutstanding: 0,
    netWorth: 3_000_000,
  },
  loans: { owedToUser: 600_000, userOwes: 0, netPosition: 600_000, overdueCount: 0 },
};

const TREND: NetWorthTrendPoint[] = [
  {
    month: "2026-07",
    netWorth: 3_000_000,
    accountTotal: 2_400_000,
    lendingOutstanding: 600_000,
    borrowingOutstanding: 0,
  },
];

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the loan-aware dashboard summary by user and local date", async () => {
    dashboardDbMocks.fetchDashboardSummary.mockResolvedValueOnce(SUMMARY);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useDashboardSummary("2026-07-14"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
    expect(dashboardDbMocks.fetchDashboardSummary).toHaveBeenCalledWith("2026-07-14");
    expect(queryClient.getQueryData(dashboardQueryKeys.summary("user-1", "2026-07-14"))).toEqual(
      SUMMARY,
    );
  });

  it("fetches net-worth history by user and reference month", async () => {
    dashboardDbMocks.fetchNetWorthTrend.mockResolvedValueOnce(TREND);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useNetWorthTrend("2026-07"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(TREND));
    expect(dashboardDbMocks.fetchNetWorthTrend).toHaveBeenCalledWith("2026-07");
    expect(queryClient.getQueryData(dashboardQueryKeys.netWorthTrend("user-1", "2026-07"))).toEqual(
      TREND,
    );
  });
});
