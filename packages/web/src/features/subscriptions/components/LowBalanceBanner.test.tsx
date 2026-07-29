import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Subscription } from "@/core/types";
import { LowBalanceBanner } from "./LowBalanceBanner";

let accounts: Account[] = [];
let subscriptions: Subscription[] = [];

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: accounts }),
}));

vi.mock("@/features/subscriptions/queries", () => ({
  useSubscriptions: () => ({ data: subscriptions }),
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${Object.values(vars).join(",")}` : key,
  }),
}));

const itel: Account = {
  id: "acc-1",
  name: "Itel",
  kind: "ewallet",
  openingBalance: 0,
  displayOrder: 0,
  balance: 14_102,
};

const cellular: Subscription = {
  id: "sub-1",
  name: "Itel plan",
  amount: 79_000,
  type: "expense",
  categoryId: "telecom",
  accountId: "acc-1",
  cadence: "monthly",
  dayOfMonth: 1,
  monthOfYear: 1,
  nextDueDate: "2026-08-01",
  active: true,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 5, 10, 0, 0));
  accounts = [itel];
  subscriptions = [cellular];
});

describe("LowBalanceBanner", () => {
  it("names the underfunded account and its shortfall", () => {
    render(<LowBalanceBanner />);
    expect(screen.getByText("sub.lowBalanceSingle:Itel")).toBeDefined();
    expect(screen.getByText(/sub\.lowBalanceShortfall:64\.898/)).toBeDefined();
  });

  it("renders nothing when the account covers its upcoming charges", () => {
    accounts = [{ ...itel, balance: 200_000 }];
    const { container } = render(<LowBalanceBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("offers no dismiss control", () => {
    render(<LowBalanceBanner />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
