import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, Person } from "@wallet/shared";
import { LoanForm } from "./LoanForm";

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
  DatePicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input
      aria-label="date-picker"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
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

const orderedAccounts: Account[] = [
  { id: "account-2", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 0 },
  { id: "account-1", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 1 },
];

describe("LoanForm", () => {
  it("creates a new Person and submits opening-loan mode without an account", async () => {
    const person: Person = { id: "person-1", name: "Mai" };
    const onCreatePerson = vi.fn().mockResolvedValue(person);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LoanForm
        people={[]}
        accounts={[]}
        onCreatePerson={onCreatePerson}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("loans.personName"), { target: { value: "Mai" } });
    fireEvent.change(screen.getByLabelText("form.amount"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "loans.createLoan" }));

    await waitFor(() => expect(onCreatePerson).toHaveBeenCalledWith("Mai"));
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "opening",
      input: expect.objectContaining({
        personId: "person-1",
        amount: 1_000_000,
        direction: "lending",
      }),
    });
    expect(screen.queryByLabelText("account-select")).toBeNull();
  });

  it("defaults a disbursed loan to the first ordered Account", async () => {
    const person: Person = { id: "person-1", name: "Mai" };
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LoanForm
        people={[person]}
        accounts={orderedAccounts}
        onCreatePerson={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect((screen.getByLabelText("account-select") as HTMLSelectElement).value).toBe("account-2");
    fireEvent.change(screen.getByLabelText("form.amount"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByRole("button", { name: "loans.createLoan" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        mode: "disbursed",
        input: expect.objectContaining({ accountId: "account-2", amount: 1_000_000 }),
      }),
    );
  });
});
