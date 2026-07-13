import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesktopTransactionsTable } from "./DesktopTransactionsTable";

const transactions = [
  {
    id: "tx-1",
    type: "expense" as const,
    amount: 150000,
    balanceAfter: 850000,
    categoryId: "food",
    accountId: "cash",
    toAccountId: null,
    merchant: "Lunch",
    note: "Quick lunch",
    date: "2026-07-05",
    time: "12:15",
    receipt: null,
    subscriptionId: null,
  },
];

const categories = [
  { id: "food", name: "Food", icon: "utensils", color: "blue", type: "expense", parentId: null },
];

const accounts = [{ id: "cash", name: "Cash" }];

vi.mock("@/features/transactions/queries", () => ({
  useTransactions: () => ({ data: transactions, isPending: false }),
  useDeleteTransactions: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/features/categories/queries", () => ({
  useCategories: () => ({ data: categories, isPending: false }),
  useCategoryLookup: () => (id: string | null | undefined) =>
    categories.find((category) => category.id === id),
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: accounts, isPending: false }),
  useAccountLookup: () => (id: string | null | undefined) =>
    accounts.find((account) => account.id === id),
}));

vi.mock("@/features/categories/components/CategoryFilterSelect", () => ({
  CategoryFilterSelect: ({ ariaLabel }: { ariaLabel: string }) => (
    <div aria-label={ariaLabel}>category-filter</div>
  ),
}));

vi.mock("@/features/transactions/components/TransactionMultiFilterSelect", () => ({
  TransactionMultiFilterSelect: ({ ariaLabel }: { ariaLabel: string }) => (
    <div aria-label={ariaLabel}>account-filter</div>
  ),
}));

vi.mock("@/features/transactions/components/TransactionsMonthSwitcher", () => ({
  TransactionsMonthSwitcher: () => <div>month-switcher</div>,
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        "tx.filterAll": "All",
        "tx.filterExpense": "Expense",
        "tx.filterIncome": "Income",
        "tx.filterTransfer": "Transfer",
        "tx.transfer": "Transfer",
        "tx.search": "Search transactions...",
        "tx.filterCategory": "Filter category",
        "tx.filterCategoryAll": "All categories",
        "tx.filterAccount": "Filter account",
        "tx.filterAccountAll": "All accounts",
        "tx.filterSelected": `${vars?.n ?? 0} selected`,
        "tx.count": `${vars?.n ?? 0} transactions`,
        "tx.colDate": "Date",
        "tx.colCategory": "Category",
        "tx.colDescription": "Description",
        "tx.colAccount": "Account",
        "tx.colAmount": "Amount",
        "tx.page": `Page ${vars?.n ?? 1} / ${vars?.total ?? 1}`,
        "tx.pagePrev": "Prev",
        "tx.pageNext": "Next",
        "tx.edit": "Edit",
        "tx.deleteOne": "Delete one",
        "tx.notFound": "No transactions found.",
      })[key] ?? key,
  }),
}));

vi.mock("@/shared/components/CategoryIcon", () => ({
  CategoryIcon: () => <span data-testid="category-icon" />,
  colorVar: () => "var(--chart-1)",
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className={className} {...props} />
  ),
}));

vi.mock("@/shared/components/Skeleton", () => ({
  TransactionsSkeleton: () => <div>loading</div>,
}));

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectPositioner: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props}>{children}</tr>
  ),
  TableHead: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th {...props}>{children}</th>
  ),
  TableCell: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props}>{children}</td>
  ),
}));

describe("DesktopTransactionsTable", () => {
  it("shows the balance subline in the amount cell without adding a new column", () => {
    render(
      <DesktopTransactionsTable
        onEdit={vi.fn()}
        month="2026-07"
        query=""
        type="all"
        categoryIds={[]}
        accountIds={[]}
        onMonthChange={vi.fn()}
        onQueryChange={vi.fn()}
        onTypeChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.getByText("Amount")).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: /balance/i })).toBeNull();

    const amountCell = screen.getByText("−150.000 ₫").closest("td");
    expect(amountCell).not.toBeNull();
    expect(within(amountCell as HTMLTableCellElement).getByText("850.000 ₫")).toBeDefined();
  });
});
