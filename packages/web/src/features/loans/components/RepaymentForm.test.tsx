import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, LoanDetail } from "@wallet/shared";
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
  AccountSelect: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <select
      aria-label="account-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">none</option>
      <option value="account-1">Cash</option>
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
  { id: "account-1", name: "Cash", kind: "cash", openingBalance: 0, balance: 0 },
];

describe("RepaymentForm", () => {
  it("defaults to the outstanding balance and submits a selected account", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RepaymentForm loan={loan} accounts={accounts} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    expect((screen.getByLabelText("form.amount") as HTMLInputElement).value).toBe("600000");
    fireEvent.change(screen.getByLabelText("account-select"), { target: { value: "account-1" } });
    fireEvent.click(screen.getByRole("button", { name: "loans.recordRepayment" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 600_000, accountId: "account-1" }),
      ),
    );
  });
});
