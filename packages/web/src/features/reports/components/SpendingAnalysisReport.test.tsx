import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpendingAnalysisReportResponse } from "@wallet/shared";
import { SpendingAnalysisReport } from "./SpendingAnalysisReport";

const openEdit = vi.fn();

let mockedReport: SpendingAnalysisReportResponse = makeReport();

vi.mock("@/features/transactions/transaction-overlay", () => ({
  useTransactionOverlay: () => ({ openEdit, openCreate: vi.fn(), close: vi.fn() }),
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    lang: "en",
    t: (key: string, vars?: Record<string, number | string>) =>
      ({
        "reports.spendingTotal": "Total spending",
        "reports.spendingVsPrevious": "vs previous period",
        "reports.spendingNew": "New",
        "reports.spendingUnchanged": "Unchanged",
        "reports.spendingUncategorized": "Uncategorized",
        "reports.spendingTrendTitle": "Spending trend",
        "reports.spendingCategoriesTitle": "Spending by category",
        "reports.spendingEmptyTitle": "No spending yet",
        "reports.spendingEmptyDesc": "There are no expense transactions in this period.",
        "reports.spendingCurrentLabel": "This period",
        "reports.spendingPreviousLabel": "Previous period",
        "reports.categoryTransactions": `${vars?.n ?? "{n}"} transactions`,
      })[key] ?? key,
  }),
}));

vi.mock("@/shared/components/Charts", () => ({
  SpendingTrendChart: () => <div data-testid="spending-trend-chart" />,
}));

vi.mock("@/shared/components/Skeleton", () => ({
  ReportsSkeleton: () => <div data-testid="reports-skeleton" />,
}));

vi.mock("@/shared/hooks/useIsDesktop", () => ({
  useIsDesktop: () => true,
}));

vi.mock("@/features/categories/queries", () => ({
  useCategoryLookup: () => (id: string) =>
    ({
      "cat-food": { id: "cat-food", name: "Food", icon: "Utensils", color: "chart-1" },
      "cat-coffee": { id: "cat-coffee", name: "Coffee", icon: "Coffee", color: "chart-2" },
    })[id],
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccountLookup: () => (id: string) =>
    ({
      "acc-1": { id: "acc-1", name: "Cash" },
    })[id],
}));

vi.mock("../queries", () => ({
  useSpendingAnalysis: () => ({
    isPending: false,
    data: mockedReport,
  }),
}));

describe("SpendingAnalysisReport", () => {
  beforeEach(() => {
    openEdit.mockReset();
    mockedReport = makeReport();
  });

  it("shows the headline total and a New badge at a zero baseline", () => {
    render(
      <SpendingAnalysisReport
        range={{ from: "2026-07-01", to: "2026-07-19" }}
        preset="this-month"
      />,
    );

    expect(screen.getByText("Total spending")).toBeTruthy();
    expect(screen.getAllByText("New").length).toBeGreaterThan(0);
  });

  it("shows the explicit Uncategorized bucket and parent-child rollup, opening the edit overlay on drill-down", async () => {
    const user = userEvent.setup();
    render(
      <SpendingAnalysisReport
        range={{ from: "2026-07-01", to: "2026-07-19" }}
        preset="this-month"
      />,
    );

    expect(screen.getByText("Uncategorized")).toBeTruthy();

    const foodRow = screen.getByText("Food");
    await user.click(foodRow);
    expect(screen.getByText("Coffee")).toBeTruthy();

    await user.click(screen.getByText("Coffee"));
    expect(screen.getByText("Coffee Shop")).toBeTruthy();

    await user.click(screen.getByText("Coffee Shop"));
    expect(openEdit).toHaveBeenCalledWith("tx-coffee", "2026-07");
  });
});

function makeReport(): SpendingAnalysisReportResponse {
  return {
    data: {
      range: { from: "2026-07-01", to: "2026-07-19" },
      comparisonRange: { from: "2026-06-01", to: "2026-06-19" },
      trendGranularity: "day",
      totals: { current: 1300, previous: 0, change: 1300, changePercentage: null },
      trend: [],
      categories: [
        {
          categoryId: "cat-food",
          current: 1300,
          previous: 0,
          change: 1300,
          changePercentage: null,
          share: 0.9286,
          transactionCount: 1,
          transactions: [
            {
              id: "tx-food",
              date: "2026-07-08",
              merchant: "Market",
              amount: 1000,
              accountId: "acc-1",
            },
          ],
          children: [
            {
              categoryId: "cat-coffee",
              current: 300,
              previous: 0,
              change: 300,
              changePercentage: null,
              share: 0.2308,
              transactionCount: 1,
              transactions: [
                {
                  id: "tx-coffee",
                  date: "2026-07-12",
                  merchant: "Coffee Shop",
                  amount: 300,
                  accountId: "acc-1",
                },
              ],
            },
          ],
        },
        {
          categoryId: null,
          current: 100,
          previous: 0,
          change: 100,
          changePercentage: null,
          share: 0.0714,
          transactionCount: 1,
          transactions: [
            {
              id: "tx-uncat",
              date: "2026-07-07",
              merchant: "Misc",
              amount: 100,
              accountId: "acc-1",
            },
          ],
          children: [],
        },
      ],
    },
  };
}
