import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DesktopDashboard } from "./DesktopDashboard";

vi.mock("@/features/dashboard/queries", () => ({
  useDashboardSummary: () => ({
    data: {
      netWorth: {
        accountTotal: 12_000_000,
        lendingOutstanding: 3_000_000,
        borrowingOutstanding: 1_000_000,
        netWorth: 14_000_000,
      },
      loans: {
        owedToUser: 3_000_000,
        userOwes: 1_000_000,
        netPosition: 2_000_000,
        overdueCount: 1,
      },
    },
    isPending: false,
  }),
  useNetWorthTrend: () => ({
    data: [
      {
        month: "2026-07",
        netWorth: 14_000_000,
        accountTotal: 12_000_000,
        lendingOutstanding: 3_000_000,
        borrowingOutstanding: 1_000_000,
      },
    ],
    isPending: false,
  }),
}));

vi.mock("@/features/transactions/queries", () => ({
  useTransactions: () => ({ data: [], isPending: false }),
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: [], isPending: false }),
}));

vi.mock("@/features/categories/queries", () => ({
  useCategoryLookup: () => () => undefined,
}));

vi.mock("@/features/subscriptions/queries", () => ({
  useSubscriptions: () => ({ data: [], isPending: false }),
}));

vi.mock("@/features/accounts/components/AccountList", () => ({
  AccountList: () => <div>account-list</div>,
}));

vi.mock("@/features/transactions/components/TransactionRow", () => ({
  TransactionRow: () => <div>transaction-row</div>,
}));

vi.mock("@/shared/components/Charts", () => ({
  BalanceTrendChart: ({ balanceLabel }: { balanceLabel: string }) => (
    <div data-testid="net-worth-chart">{balanceLabel}</div>
  ),
  CategoryDonut: () => <div data-testid="category-donut" />,
}));

vi.mock("@/shared/components/Skeleton", () => ({
  DashboardSkeleton: () => <div>loading</div>,
}));

vi.mock("@/core/i18n", () => ({
  DATE_LOCALE: {
    en: { months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
  },
  useLang: () => ({
    lang: "en",
    t: (key: string, vars?: Record<string, number>) =>
      ({
        "dashboard.netWorth": "Net worth",
        "dashboard.netWorthTrend6m": "6-month net worth trend",
        "dashboard.loans": "Personal loans",
        "dashboard.viewAll": "View all",
        "loans.netPosition": "Net position",
        "loans.owedToUser": "Owed to you",
        "loans.userOwes": "You owe",
        "loans.overdueCountValue": `${vars?.n ?? 0} overdue`,
      })[key] ?? key,
  }),
}));

describe("DesktopDashboard", () => {
  it("shows net worth and the compact loan summary", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<DesktopDashboard onNavigate={onNavigate} onEdit={vi.fn()} />);

    expect(screen.getAllByText("Net worth").length).toBeGreaterThan(0);
    expect(screen.getByText("14.000.000 ₫")).toBeDefined();
    expect(screen.getByText("Personal loans")).toBeDefined();
    expect(screen.getByText("2.000.000 ₫")).toBeDefined();
    expect(screen.getByText("1 overdue")).toBeDefined();
    expect(screen.getByTestId("net-worth-chart")).toBeDefined();

    await user.click(screen.getAllByRole("button", { name: "View all" })[0]!);
    expect(onNavigate).toHaveBeenCalledWith("loans");
  });
});
