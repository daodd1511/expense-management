import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, LoanDetail } from "@wallet/shared";
import { OriginForm } from "./OriginForm";

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
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  ),
}));

const accounts: Account[] = [
  { id: "account-2", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 0 },
  { id: "account-1", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 1 },
];
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

describe("OriginForm", () => {
  it("defaults origin correction to the first ordered Account", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <OriginForm loan={loan} accounts={accounts} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    expect((screen.getByLabelText("account-select") as HTMLSelectElement).value).toBe("account-2");
    fireEvent.click(screen.getByRole("button", { name: "form.save" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: "account-2", amount: 1_000_000 }),
      ),
    );
  });
});
