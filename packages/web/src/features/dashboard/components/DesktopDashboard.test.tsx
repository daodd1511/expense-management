import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopDashboard } from "./DesktopDashboard";

const navigate = vi.fn();
let accounts = [{ id: "acc-1", name: "Cash", kind: "cash", openingBalance: 0, balance: 0 }];

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

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
        owedToUser: 3_000_000_000,
        userOwes: 1_000_000_000,
        netPosition: 2_000_000_000,
        overdueCount: 1,
      },
    },
    isPending: false,
  }),
  useBalanceTrend: () => ({
    data: [
      {
        month: "2026-07",
        balance: 12_000_000,
      },
    ],
    isPending: false,
  }),
}));

vi.mock("@/features/transactions/queries", () => ({
  useTransactions: () => ({ data: [], isPending: false }),
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: accounts, isPending: false }),
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
    <div data-testid="balance-chart">{balanceLabel}</div>
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
        "dashboard.monthBalance": "Monthly balance",
        "dashboard.trend6m": "6-month balance trend",
        "dashboard.loans": "Personal loans",
        "dashboard.viewAll": "View all",
        "loans.netPosition": "Net position",
        "loans.owedToUser": "Owed to you",
        "loans.userOwes": "You owe",
        "loans.overdueCountValue": `${vars?.n ?? 0} overdue`,
        "accounts.firstTitle": "Start with your first account",
        "accounts.firstDescription": "Create an account before adding transactions.",
        "accounts.firstAction": "Create your first Account",
      })[key] ?? key,
  }),
}));

describe("DesktopDashboard", () => {
  beforeEach(() => {
    navigate.mockReset();
    accounts = [{ id: "acc-1", name: "Cash", kind: "cash", openingBalance: 0, balance: 0 }];
  });

  it("shows the balance trend and compact loan summary without net worth", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<DesktopDashboard onNavigate={onNavigate} onEdit={vi.fn()} />);

    expect(screen.queryByText("Net worth")).toBeNull();
    expect(screen.getByText("Personal loans")).toBeDefined();
    expect(screen.getByText("2B ₫").getAttribute("title")).toBe("2.000.000.000 ₫");
    expect(screen.getByText("1 overdue")).toBeDefined();
    expect(screen.getByTestId("balance-chart").textContent).toBe("Monthly balance");

    await user.click(screen.getAllByRole("button", { name: "View all" })[0]!);
    expect(onNavigate).toHaveBeenCalledWith("loans");
  });

  it("guides a user without accounts to Account creation", async () => {
    const user = userEvent.setup();
    accounts = [];

    render(<DesktopDashboard onNavigate={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Start with your first account" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Create your first Account" }));

    expect(navigate).toHaveBeenCalledWith({
      to: "/accounts",
      search: { create: expect.any(String) },
    });
  });
});
