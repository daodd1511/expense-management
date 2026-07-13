import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountForm } from "./AccountForm";

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "accounts.kind": "Account type",
        "accounts.kindCash": "Cash",
        "accounts.kindBank": "Bank",
        "accounts.kindCard": "Credit card",
        "accounts.kindEwallet": "E-wallet",
        "accounts.name": "Account name",
        "accounts.namePlaceholder": "e.g. Savings",
        "accounts.balance": "Opening balance",
        "accounts.balanceSign": "Toggle balance sign",
        "accounts.save": "Save changes",
        "accounts.create": "Create account",
        "form.cancel": "Cancel",
      })[key] ?? key,
  }),
  translate: (key: string) => key,
}));

describe("AccountForm", () => {
  it("shows opening balance when creating an account", () => {
    render(<AccountForm onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Opening balance")).toBeDefined();
  });

  it("hides opening balance and preserves it when editing an account", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountForm
        initial={{
          id: "account-1",
          name: "Checking",
          kind: "bank",
          openingBalance: 1_000,
          balance: 1_200,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Opening balance")).toBeNull();

    await user.clear(screen.getByLabelText("Account name"));
    await user.type(screen.getByLabelText("Account name"), "Updated checking");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Updated checking",
        kind: "bank",
        openingBalance: 1_000,
      });
    });
  });

  it("formats the opening balance with thousands separators while typing", async () => {
    const user = userEvent.setup();
    render(<AccountForm onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Opening balance") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "1500000");

    expect(input.value).toBe("1.500.000");
  });

  it("supports a negative opening balance via the sign toggle", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AccountForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Account name"), "Credit card");
    const input = screen.getByLabelText("Opening balance");
    await user.clear(input);
    await user.type(input, "500000");
    await user.click(screen.getByRole("button", { name: "Toggle balance sign" }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Credit card",
        kind: "cash",
        openingBalance: -500_000,
      });
    });
  });
});
