import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionRow } from "./TransactionRow";

const MOCK_CATEGORIES = [
  { id: "food", name: "Food", icon: "utensils", color: "blue", type: "expense", parentId: null },
  { id: "dating", name: "Dating", icon: "heart", color: "pink", type: "expense", parentId: "food" },
  { id: "salary", name: "Salary", icon: "wallet", color: "green", type: "income", parentId: null },
];

const MOCK_ACCOUNTS = [
  { id: "cash", name: "Cash" },
  { id: "bank", name: "Bank" },
];

vi.mock("@/features/categories/queries", () => ({
  useCategoryLookup: () => (id: string | null | undefined) =>
    MOCK_CATEGORIES.find((category) => category.id === id),
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccountLookup: () => (id: string | null | undefined) =>
    MOCK_ACCOUNTS.find((account) => account.id === id),
}));

vi.mock("@/features/transactions/queries", () => ({
  useDeleteTransaction: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "tx.transfer": "Transfer",
      })[key] ?? key,
  }),
}));

function makeTransaction(overrides: Partial<Parameters<typeof TransactionRow>[0]["tx"]> = {}) {
  return {
    id: "tx-1",
    type: "expense" as const,
    amount: 150000,
    categoryId: "food",
    accountId: "cash",
    toAccountId: null,
    merchant: "Coffee",
    note: undefined,
    date: "2026-07-05",
    receipt: null,
    subscriptionId: null,
    ...overrides,
  };
}

describe("TransactionRow", () => {
  it("shows the parent breadcrumb only for nested categories", () => {
    render(<TransactionRow tx={makeTransaction({ categoryId: "dating" })} />);

    expect(screen.getByText("Food")).toBeDefined();
    expect(screen.getByText("Dating")).toBeDefined();
    expect(screen.getByText("Cash")).toBeDefined();
  });

  it("keeps top-level categories flat", () => {
    render(
      <TransactionRow
        tx={makeTransaction({
          id: "tx-2",
          type: "income",
          amount: 5000000,
          categoryId: "salary",
          accountId: "bank",
          merchant: "Payroll",
        })}
      />,
    );

    expect(screen.getByText("Salary")).toBeDefined();
    expect(screen.getByText("Bank")).toBeDefined();
  });

  it("appends the note to the account subtitle when present", () => {
    render(<TransactionRow tx={makeTransaction({ note: "Split with roommate" })} />);

    expect(screen.getByText("Cash · Split with roommate")).toBeDefined();
  });

  it("leaves transfer subtitles unchanged", () => {
    render(
      <TransactionRow
        tx={makeTransaction({
          id: "tx-3",
          type: "transfer",
          amount: 200000,
          categoryId: null,
          toAccountId: "bank",
          merchant: "Transfer",
        })}
      />,
    );

    expect(screen.getByText("Transfer")).toBeDefined();
    expect(screen.getByText("Cash → Bank")).toBeDefined();
  });

  it("shows the balance subline for expense and income rows", () => {
    const { rerender } = render(<TransactionRow tx={makeTransaction({ balanceAfter: 125000 })} />);

    expect(screen.getByText("125.000 ₫")).toBeDefined();

    rerender(
      <TransactionRow
        tx={makeTransaction({
          id: "tx-2",
          type: "income",
          accountId: "bank",
          categoryId: "salary",
          amount: 5000000,
          balanceAfter: 6125000,
        })}
      />,
    );
    expect(screen.getByText("6.125.000 ₫")).toBeDefined();
  });

  it("shows post-transfer balances for both accounts", () => {
    const { rerender } = render(
      <TransactionRow
        tx={makeTransaction({
          type: "transfer",
          categoryId: null,
          toAccountId: "bank",
          amount: 300000,
          balanceAfter: 825000,
          toAccountBalanceAfter: 955000,
        })}
      />,
    );

    expect(screen.getByText("Cash: 825.000 ₫")).toBeDefined();
    expect(screen.getByText("Bank: 955.000 ₫")).toBeDefined();

    rerender(
      <TransactionRow
        balanceAccountId="bank"
        tx={makeTransaction({
          type: "transfer",
          categoryId: null,
          toAccountId: "bank",
          amount: 300000,
          balanceAfter: 825000,
          toAccountBalanceAfter: 955000,
        })}
      />,
    );
    expect(screen.getByText("955.000 ₫")).toBeDefined();
    expect(screen.queryByText("Cash: 825.000 ₫")).toBeNull();
  });
});
