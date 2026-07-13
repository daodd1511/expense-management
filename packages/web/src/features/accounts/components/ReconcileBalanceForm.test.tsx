import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReconcileBalanceForm } from "./ReconcileBalanceForm";

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@/features/categories/queries", () => ({
  useCategories: () => ({
    data: [
      {
        id: "adjustment-expense",
        name: "Balance Adjustment",
        icon: "Scale",
        color: "chart-12",
        isSystem: true,
        isHidden: true,
        type: "expense",
        parentId: null,
      },
      {
        id: "adjustment-income",
        name: "Balance Adjustment",
        icon: "Scale",
        color: "chart-12",
        isSystem: true,
        isHidden: true,
        type: "income",
        parentId: null,
      },
    ],
  }),
}));

vi.mock("@/features/transactions/queries", () => ({
  useAddTransaction: () => mutationMocks,
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "accounts.computedBalance": "Current balance",
        "accounts.actualBalance": "Actual balance",
        "accounts.actualBalanceSign": "Toggle balance sign",
        "accounts.reconcile": "Balance adjustment",
        "accounts.reconcileTransaction": "Balance adjustment",
        "accounts.saveAdjustment": "Save adjustment",
        "form.cancel": "Cancel",
      })[key] ?? key,
  }),
  translate: (key: string) => key,
}));

const account = {
  id: "account-1",
  name: "Checking",
  kind: "bank" as const,
  openingBalance: 500,
  balance: 1_000,
};

describe("ReconcileBalanceForm", () => {
  beforeEach(() => {
    mutationMocks.mutateAsync.mockReset();
    mutationMocks.mutateAsync.mockResolvedValue(undefined);
  });

  it("creates an expense adjustment when the actual balance is lower", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ReconcileBalanceForm account={account} onCancel={onCancel} />);

    await user.clear(screen.getByLabelText("Actual balance"));
    await user.type(screen.getByLabelText("Actual balance"), "800");
    await user.click(screen.getByRole("button", { name: "Save adjustment" }));

    await waitFor(() => {
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          categoryId: "adjustment-expense",
          amount: 200,
          accountId: "account-1",
        }),
      );
    });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("creates an income adjustment when the actual balance is higher", async () => {
    const user = userEvent.setup();
    render(<ReconcileBalanceForm account={account} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText("Actual balance"));
    await user.type(screen.getByLabelText("Actual balance"), "1200");
    await user.click(screen.getByRole("button", { name: "Save adjustment" }));

    await waitFor(() => {
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "income",
          categoryId: "adjustment-income",
          amount: 200,
          accountId: "account-1",
        }),
      );
    });
  });

  it("accepts a negative actual balance via the sign toggle to represent a deficit", async () => {
    const user = userEvent.setup();
    render(<ReconcileBalanceForm account={account} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText("Actual balance"));
    await user.type(screen.getByLabelText("Actual balance"), "300");
    await user.click(screen.getByRole("button", { name: "Toggle balance sign" }));
    await user.click(screen.getByRole("button", { name: "Save adjustment" }));

    await waitFor(() => {
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          categoryId: "adjustment-expense",
          amount: 1_300,
          accountId: "account-1",
        }),
      );
    });
  });

  it("strips non-numeric characters from the amount input, with no minus key required", async () => {
    const user = userEvent.setup();
    render(<ReconcileBalanceForm account={account} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Actual balance") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "a8b0c0x");

    expect(input.value).toBe("800");
  });

  it("closes without creating a transaction when the balances match", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ReconcileBalanceForm account={account} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Save adjustment" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(mutationMocks.mutateAsync).not.toHaveBeenCalled();
  });
});
