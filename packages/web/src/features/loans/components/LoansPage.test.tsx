import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoansPage } from "./LoansPage";

const mocks = vi.hoisted(() => ({ isDesktop: true }));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${Object.values(vars).join(",")}` : key,
  }),
}));

vi.mock("@/shared/hooks/useIsDesktop", () => ({ useIsDesktop: () => mocks.isDesktop }));
vi.mock("./LoanOverlays", () => ({ LoanOverlays: () => null }));
vi.mock("@/features/loans/queries", () => ({
  useLoanSummaries: () => ({
    data: [
      {
        id: "loan-1",
        personId: "person-1",
        personName: "Mai",
        direction: "lending",
        originAmount: 1_000_000,
        outstandingBalance: 600_000,
        dueDate: "2026-07-10",
        status: "overdue",
      },
    ],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePersonSummaries: () => ({
    data: [
      {
        id: "person-1",
        name: "Mai",
        lendingTotal: 600_000,
        borrowingTotal: 0,
        netPosition: 600_000,
        openCount: 1,
        overdueCount: 1,
      },
    ],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("LoansPage", () => {
  beforeEach(() => {
    mocks.isDesktop = true;
  });

  it("renders the desktop person-first ledger with KPIs", () => {
    render(<LoansPage />);
    expect(screen.getByText("loans.ledgerLabel")).toBeTruthy();
    expect(screen.getAllByText("Mai").length).toBeGreaterThan(0);
    expect(screen.getAllByText("loans.owedToUser").length).toBeGreaterThan(0);
    expect(screen.getAllByText("loans.statusOverdue").length).toBeGreaterThan(0);
  });

  it("renders the purpose-built mobile card layout below the desktop breakpoint", () => {
    mocks.isDesktop = false;
    render(<LoansPage />);
    expect(screen.getByText("loans.ledgerLabel")).toBeTruthy();
    expect(screen.getAllByText("Mai").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("loans.newLoan")).toBeTruthy();
  });
});
