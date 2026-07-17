import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionForm } from "./TransactionForm";

const MOCK_CATEGORIES = [
  {
    id: "food",
    name: "Food",
    icon: "utensils",
    color: "blue",
    isHidden: false,
    type: "expense",
    parentId: null,
  },
  {
    id: "salary",
    name: "Salary",
    icon: "wallet",
    color: "green",
    isHidden: false,
    type: "income",
    parentId: null,
  },
  {
    id: "adjustment",
    name: "Balance Adjustment",
    icon: "scale",
    color: "gray",
    isHidden: true,
    type: "expense",
    parentId: null,
  },
];

const DEFAULT_ACCOUNTS = [
  { id: "cash", name: "Cash" },
  { id: "bank", name: "Bank" },
];
let mockAccounts = DEFAULT_ACCOUNTS;

vi.mock("@/features/categories/queries", () => ({
  useCategories: () => ({ data: MOCK_CATEGORIES }),
  useCategoryLookup: () => (id: string | null | undefined) =>
    MOCK_CATEGORIES.find((c) => c.id === id),
}));

vi.mock("@/features/categories/favorites-queries", () => ({
  // both marked favorite so they appear directly, without needing "Show all"
  useFavoriteCategoryIds: () => new Set(["food", "salary", "adjustment"]),
}));

vi.mock("@/shared/hooks/useIsDesktop", () => ({
  useIsDesktop: () => true,
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({
    data: mockAccounts,
  }),
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    lang: "en",
    t: (key: string) =>
      ({
        "form.expense": "Expense",
        "form.income": "Income",
        "form.transfer": "Transfer",
        "form.note": "Note",
        "form.notePlaceholder": "Note placeholder",
        "form.account": "Account",
        "form.fromAccount": "From account",
        "form.toAccount": "To account",
        "form.selectAccount": "Select account",
        "form.category": "Category",
        "form.amount": "Amount",
        "form.fee": "Fee",
        "form.date": "Date",
        "form.time": "Time",
        "form.timeHour": "Hour",
        "form.timeMinute": "Minute",
        "form.addTitle": "Add transaction",
        "form.editTitle": "Edit transaction",
        "form.close": "Close",
        "form.cancel": "Cancel",
        "form.submit": "Save",
        "form.save": "Save",
        "form.defaultTransfer": "Transfer",
        "form.defaultTx": "Transaction",
      })[key] ?? key,
  }),
  translate: (key: string) => key,
}));

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPopup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPositioner: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children: ReactNode | ((value: string | null) => ReactNode) }) => (
    <div>{typeof children === "function" ? children("cash") : children}</div>
  ),
}));

vi.mock("@/shared/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => <input aria-label="Date" readOnly value={value} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

describe("TransactionForm", () => {
  beforeEach(() => {
    mockAccounts = DEFAULT_ACCOUNTS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autofocuses the amount input on desktop and formats digits inline while typing", async () => {
    const user = userEvent.setup();

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={() => undefined}
      />,
    );

    const amountInput = screen.getByPlaceholderText("0") as HTMLInputElement;
    expect(document.activeElement).toBe(amountInput);

    await user.type(amountInput, "1000000");

    expect(amountInput.value).toBe("1.000.000");
    expect(screen.queryByText("1.000.000 ₫")).toBeNull();
  });

  it("avoids immediate autofocus on mobile sheet open", () => {
    vi.useFakeTimers();

    render(
      <TransactionForm
        variant="mobile"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={() => undefined}
      />,
    );

    const amountInput = screen.getByPlaceholderText("0") as HTMLInputElement;
    expect(document.activeElement).not.toBe(amountInput);
  });

  it("renders safely and prevents submission when no Account exists", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    mockAccounts = [];

    expect(() =>
      render(<TransactionForm variant="desktop" onSubmit={onSubmit} onCancel={vi.fn()} />),
    ).not.toThrow();

    await user.type(screen.getByPlaceholderText("0"), "100");
    await user.click(screen.getByRole("button", { name: "Food" }));

    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a date-only ISO string", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TransactionForm variant="desktop" onSubmit={onSubmit} onCancel={() => undefined} />);

    await user.type(screen.getByPlaceholderText("0"), "1213");
    await user.click(screen.getByRole("button", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        amount: 1213,
        categoryId: "food",
        accountId: "cash",
        merchant: "Food",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        time: expect.stringMatching(/^\d{2}:\d{2}$/),
      }),
    );

    const [{ date }] = onSubmit.mock.calls[0];
    expect(date.includes("T")).toBe(false);
  });

  it("filters hidden categories as well as categories of another type", async () => {
    const user = userEvent.setup();

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Food" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Salary" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Balance Adjustment" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Salary" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Food" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Balance Adjustment" })).toBeNull();
  });

  it("submits an optional fee only for transfers", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm variant="desktop" onSubmit={onSubmit} onCancel={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await user.click(screen.getByRole("switch", { name: "Fee" }));
    const amountInputs = screen.getAllByPlaceholderText("0");
    await user.type(amountInputs[0]!, "100");
    await user.type(amountInputs[1]!, "10");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "transfer", amount: 100, fee: 10 }),
    );
  });

  it("clears the selected category when switching type away from its type", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TransactionForm variant="desktop" onSubmit={onSubmit} onCancel={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: "Income" }));
    await user.click(screen.getByRole("button", { name: "Salary" }));
    await user.type(screen.getByPlaceholderText("0"), "5000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "income", categoryId: "salary" }),
    );
  });

  it("keeps the form open with input intact and shows an inline banner when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));

    render(<TransactionForm variant="desktop" onSubmit={onSubmit} onCancel={() => undefined} />);

    await user.type(screen.getByPlaceholderText("0"), "1213");
    await user.click(screen.getByRole("button", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });
});
