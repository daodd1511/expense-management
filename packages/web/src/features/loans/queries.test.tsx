import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoanDetail, LoanSummary, PersonSummary } from "@wallet/shared";
import {
  loanQueryKeys,
  useAddLoanRepayment,
  useLoanDetail,
  useLoanSummaries,
  usePersonSummaries,
} from "./queries";

const loanDbMocks = vi.hoisted(() => ({
  fetchLoanSummaries: vi.fn(),
  fetchPersonSummaries: vi.fn(),
  fetchLoanDetail: vi.fn(),
  insertLoanRepayment: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...loanDbMocks };
});

const LOAN_SUMMARY: LoanSummary = {
  id: "loan-1",
  personId: "person-1",
  personName: "Mai",
  direction: "lending",
  originAmount: 1_000_000,
  outstandingBalance: 600_000,
  status: "open",
};

const PERSON_SUMMARY: PersonSummary = {
  id: "person-1",
  name: "Mai",
  lendingTotal: 600_000,
  borrowingTotal: 0,
  netPosition: 600_000,
  openCount: 1,
  overdueCount: 0,
};

const LOAN_DETAIL: LoanDetail = {
  ...LOAN_SUMMARY,
  events: [
    {
      id: "event-1",
      loanId: "loan-1",
      kind: "disbursement",
      amount: 1_000_000,
      date: "2026-07-01",
    },
  ],
};

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

describe("loan queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes loan lists, person aggregates, and detail by user and local date", async () => {
    loanDbMocks.fetchLoanSummaries.mockResolvedValueOnce([LOAN_SUMMARY]);
    loanDbMocks.fetchPersonSummaries.mockResolvedValueOnce([PERSON_SUMMARY]);
    loanDbMocks.fetchLoanDetail.mockResolvedValueOnce(LOAN_DETAIL);
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const loans = renderHook(() => useLoanSummaries("2026-07-14"), { wrapper });
    const people = renderHook(() => usePersonSummaries("2026-07-14"), { wrapper });
    const detail = renderHook(() => useLoanDetail("loan-1", "2026-07-14"), { wrapper });

    await waitFor(() => expect(loans.result.current.data).toEqual([LOAN_SUMMARY]));
    await waitFor(() => expect(people.result.current.data).toEqual([PERSON_SUMMARY]));
    await waitFor(() => expect(detail.result.current.data).toEqual(LOAN_DETAIL));
    expect(queryClient.getQueryData(loanQueryKeys.summaries("user-1", "2026-07-14"))).toEqual([
      LOAN_SUMMARY,
    ]);
    expect(queryClient.getQueryData(loanQueryKeys.personSummaries("user-1", "2026-07-14"))).toEqual(
      [PERSON_SUMMARY],
    );
    expect(
      queryClient.getQueryData(loanQueryKeys.detail("user-1", "loan-1", "2026-07-14")),
    ).toEqual(LOAN_DETAIL);
  });

  it("invalidates every loan-dependent feature after a mutation", async () => {
    loanDbMocks.insertLoanRepayment.mockResolvedValueOnce(LOAN_DETAIL);
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useAddLoanRepayment("2026-07-14"), { wrapper });

    act(() => {
      result.current.mutate({
        loanId: "loan-1",
        input: { amount: 400_000, accountId: "account-1", date: "2026-07-14" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(loanDbMocks.insertLoanRepayment).toHaveBeenCalledWith(
      "loan-1",
      { amount: 400_000, accountId: "account-1", date: "2026-07-14" },
      "2026-07-14",
    );
    expect(invalidateSpy).toHaveBeenCalledTimes(7);
    for (const queryKey of [
      ["loans", "user-1"],
      ["transactions", "user-1"],
      ["accounts", "user-1"],
      ["reports", "user-1"],
      ["analytics", "dashboard-summary", "user-1"],
      ["analytics", "balance-trend", "user-1"],
      ["analytics", "net-worth-trend", "user-1"],
    ]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }
  });
});
