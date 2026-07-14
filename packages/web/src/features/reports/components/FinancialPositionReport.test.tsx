import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinancialPositionReport } from "./FinancialPositionReport";

vi.mock("@/features/reports/queries", () => ({
  useFinancialPosition: () => ({
    isPending: false,
    data: {
      data: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        opening: {
          accountTotal: 10_000_000,
          lendingOutstanding: 2_000_000,
          borrowingOutstanding: 1_000_000,
          netWorth: 11_000_000,
        },
        closing: {
          accountTotal: 12_000_000,
          lendingOutstanding: 3_000_000,
          borrowingOutstanding: 1_000_000,
          netWorth: 14_000_000,
        },
        income: 5_000_000,
        expense: 2_000_000,
        surplus: 3_000_000,
        loanCashFlow: {
          lent: 1_000_000,
          borrowed: 0,
          lendingRepaymentsReceived: 500_000,
          borrowingRepaymentsPaid: 0,
          net: -500_000,
        },
        balanceAdjustments: -500_000,
        writeOffs: 0,
        forgiveness: 0,
        openingLoanAdjustments: { lending: 0, borrowing: 0 },
        reconciliation: {
          accountTotal: { expected: 12_000_000, actual: 12_000_000, matches: true },
          netWorth: { expected: 14_000_000, actual: 14_000_000, matches: true },
        },
      },
    },
  }),
}));

vi.mock("@/shared/hooks/useIsDesktop", () => ({
  useIsDesktop: () => true,
}));

vi.mock("@/shared/components/Skeleton", () => ({
  ReportsSkeleton: () => <div>loading</div>,
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      ({
        "reports.positionOpening": "Opening position",
        "reports.positionClosing": "Closing position",
        "reports.operatingFlow": "Operating cash flow",
        "reports.loanCashFlow": "Loan cash flow",
        "reports.nonCashChanges": "Non-cash changes",
        "reports.reconciled": "Figures reconcile",
        "reports.reconciliationDetail": `Accounts ${vars?.account} · Net worth ${vars?.netWorth}`,
        "reports.accountTotal": "Account total",
        "dashboard.netWorth": "Net worth",
      })[key] ?? key,
  }),
}));

describe("FinancialPositionReport", () => {
  it("renders opening and closing positions with reconciliation status", () => {
    render(<FinancialPositionReport month="2026-07" />);

    expect(screen.getByText("Opening position")).toBeDefined();
    expect(screen.getByText("Closing position")).toBeDefined();
    expect(screen.getByText("Operating cash flow")).toBeDefined();
    expect(screen.getByText("Loan cash flow")).toBeDefined();
    expect(screen.getByText("Non-cash changes")).toBeDefined();
    expect(screen.getByText("Figures reconcile")).toBeDefined();
    expect(screen.getByText("Accounts 12.000.000 ₫ · Net worth 14.000.000 ₫")).toBeDefined();
  });
});
