import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "@wallet/shared";
import { SubscriptionForm } from "./SubscriptionForm";

const orderedAccounts: Account[] = [
  { id: "bank", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 0 },
  { id: "cash", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 1 },
];

vi.mock("@/core/i18n", () => ({
  useLang: () => ({ lang: "en", t: (key: string) => key }),
}));
vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: orderedAccounts }),
}));
vi.mock("@/features/categories/queries", () => ({
  useCategories: () => ({ data: [] }),
  useCategoryLookup: () => () => undefined,
}));
vi.mock("@/features/categories/favorites-queries", () => ({
  useFavoriteCategoryIds: () => new Set<string>(),
}));
vi.mock("@/features/categories/components/FavoriteCategoryPicker", () => ({
  FavoriteCategoryPicker: () => null,
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
vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPopup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPositioner: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children: ReactNode | ((value: string | null) => ReactNode) }) => (
    <div>{typeof children === "function" ? children("1") : children}</div>
  ),
}));

describe("SubscriptionForm", () => {
  it("defaults to the first Account without re-sorting the API order", () => {
    render(<SubscriptionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText("account-select") as HTMLSelectElement;
    expect(select.value).toBe("bank");
    expect([...select.options].map((option) => option.value)).toEqual(["bank", "cash"]);
  });
});
