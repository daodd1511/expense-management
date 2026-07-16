import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, LoanDetail, LoanEvent } from "@wallet/shared";
import { RepaymentForm } from "./RepaymentForm";

vi.mock("@/core/i18n", () => ({ useLang: () => ({ t: (key: string) => key }) }));
vi.mock("@/shared/components/AmountField", () => ({
  AmountField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("@/shared/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => (
    <input aria-label="date-picker" value={value} readOnly />
  ),
}));
vi.mock("@/features/accounts/components/AccountSelect", () => ({
  AccountSelect: ({
    value,
    onChange,
    accounts,
  }: {
    value: string;
    onChange: (value: string) => void;
    accounts: Account[];
  }) => (
    <select
      aria-label="account-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">none</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  ),
}));

const loan: LoanDetail = {
  id: "loan-1",
  personId: "person-1",
  personName: "Mai",
  direction: "lending",
  originAmount: 1_000_000,
  outstandingBalance: 600_000,
  status: "open",
  events: [],
};
const accounts: Account[] = [
  {
    id: "account-2",
    name: "Bank",
    kind: "bank",
    openingBalance: 0,
    displayOrder: 0,
    balance: 0,
  },
  {
    id: "account-1",
    name: "Cash",
    kind: "cash",
    openingBalance: 0,
    displayOrder: 1,
    balance: 0,
  },
];
const repayment: LoanEvent = {
  id: "repayment-1",
  loanId: "loan-1",
  kind: "repayment",
  amount: 400_000,
  date: "2026-07-10",
};

describe("RepaymentForm", () => {
  it("defaults to the outstanding balance and first ordered Account", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RepaymentForm loan={loan} accounts={accounts} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    expect((screen.getByLabelText("form.amount") as HTMLInputElement).value).toBe("600000");
    expect((screen.getByLabelText("account-select") as HTMLSelectElement).value).toBe("account-2");
    fireEvent.click(screen.getByRole("button", { name: "loans.recordRepayment" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 600_000, accountId: "account-2" }),
      ),
    );
  });

  it("offers deletion only while editing an existing repayment", () => {
    const onDelete = vi.fn();
    const { rerender } = render(
      <RepaymentForm
        loan={loan}
        initial={repayment}
        accounts={accounts}
        onSubmit={vi.fn()}
        onDelete={onDelete}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "loans.deleteRepayment" }));
    expect(onDelete).toHaveBeenCalledOnce();

    rerender(
      <RepaymentForm loan={loan} accounts={accounts} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "loans.deleteRepayment" })).toBeNull();
  });
});
