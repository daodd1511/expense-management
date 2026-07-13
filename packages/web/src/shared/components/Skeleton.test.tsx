import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AccountsSkeleton,
  BudgetsSkeleton,
  CategoriesSkeleton,
  DashboardSkeleton,
  SubscriptionsSkeleton,
  TransactionsSkeleton,
} from "./Skeleton";

describe("Skeleton screens", () => {
  it.each([
    ["dashboard-skeleton", DashboardSkeleton],
    ["accounts-skeleton", AccountsSkeleton],
    ["budgets-skeleton", BudgetsSkeleton],
    ["transactions-skeleton", TransactionsSkeleton],
    ["subscriptions-skeleton", SubscriptionsSkeleton],
  ] as const)("%s renders in both mobile and desktop variants", (testId, Component) => {
    const { unmount } = render(<Component />);
    expect(screen.getByTestId(testId)).toBeDefined();
    unmount();

    render(<Component mobile />);
    expect(screen.getByTestId(testId)).toBeDefined();
  });

  it("categories-skeleton renders in both mobile and desktop variants", () => {
    const { unmount } = render(<CategoriesSkeleton />);
    expect(screen.getByTestId("categories-skeleton")).toBeDefined();
    unmount();

    render(<CategoriesSkeleton mobile />);
    expect(screen.getByTestId("categories-skeleton")).toBeDefined();
  });
});
