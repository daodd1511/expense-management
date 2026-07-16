import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobileHome } from "./MobileHome";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/features/dashboard/queries", () => ({
  useDashboardSummary: () => ({
    data: {
      netWorth: { accountTotal: 0, lendingOutstanding: 0, borrowingOutstanding: 0, netWorth: 0 },
      loans: { owedToUser: 0, userOwes: 0, netPosition: 0, overdueCount: 0 },
    },
    isPending: false,
  }),
  useBalanceTrend: () => ({ data: [], isPending: false }),
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

vi.mock("@/shared/components/Charts", () => ({
  BalanceTrendChart: () => null,
  CategoryDonut: () => null,
}));

vi.mock("@/shared/components/Skeleton", () => ({
  DashboardSkeleton: () => <div>loading</div>,
}));

vi.mock("@/core/i18n", () => ({
  DATE_LOCALE: { en: { months: [] } },
  useLang: () => ({
    lang: "en",
    t: (key: string) =>
      ({
        "accounts.firstTitle": "Start with your first account",
        "accounts.firstDescription": "Create an account before adding transactions.",
        "accounts.firstAction": "Create your first Account",
      })[key] ?? key,
  }),
}));

describe("MobileHome", () => {
  it("guides a user without accounts to Account creation", async () => {
    const user = userEvent.setup();
    navigate.mockReset();

    render(<MobileHome onNavigate={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Start with your first account" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Create your first Account" }));

    expect(navigate).toHaveBeenCalledWith({
      to: "/accounts",
      search: { create: expect.any(String) },
    });
  });
});
