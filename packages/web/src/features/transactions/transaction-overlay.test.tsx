import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TransactionOverlayProvider,
  TransactionOverlaySheet,
  useTransactionOverlay,
} from "./transaction-overlay";

const navigate = vi.fn();
let accounts: { id: string }[] = [];

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: accounts }),
}));

vi.mock("./queries", () => ({
  useTransactions: () => ({ data: [] }),
  useAddTransaction: () => ({ mutateAsync: vi.fn() }),
  useUpdateTransaction: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("./components/TransactionForm", () => ({
  TransactionForm: ({ initialAccountId }: { initialAccountId?: string }) => (
    <div>{initialAccountId ? `transaction-form:${initialAccountId}` : "transaction-form"}</div>
  ),
}));

vi.mock("@/shared/components/ui/overlay", () => ({
  BottomSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({ t: (key: string) => key }),
}));

function OpenTransactionButton() {
  const { openCreate } = useTransactionOverlay();
  return (
    <>
      <button onClick={() => openCreate("2026-07")}>Open transaction</button>
      <button onClick={() => openCreate("2026-07", "acc-1")}>Open filtered transaction</button>
    </>
  );
}

function renderOverlay() {
  render(
    <TransactionOverlayProvider>
      <OpenTransactionButton />
      <TransactionOverlaySheet variant="desktop" />
    </TransactionOverlayProvider>,
  );
}

describe("TransactionOverlayProvider", () => {
  beforeEach(() => {
    accounts = [];
    navigate.mockReset();
  });

  it("redirects transaction creation to Account creation when no Account exists", async () => {
    const user = userEvent.setup();
    renderOverlay();

    await user.click(screen.getByRole("button", { name: "Open transaction" }));

    expect(navigate).toHaveBeenCalledWith({
      to: "/accounts",
      search: { create: expect.any(String) },
    });
    expect(screen.queryByText("transaction-form")).toBeNull();
  });

  it("opens transaction creation when an Account exists", async () => {
    const user = userEvent.setup();
    accounts = [{ id: "acc-1" }];
    renderOverlay();

    await user.click(screen.getByRole("button", { name: "Open transaction" }));

    expect(await screen.findByText("transaction-form")).toBeDefined();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("passes a filtered Account into transaction creation", async () => {
    const user = userEvent.setup();
    accounts = [{ id: "acc-1" }];
    renderOverlay();

    await user.click(screen.getByRole("button", { name: "Open filtered transaction" }));

    expect(await screen.findByText("transaction-form:acc-1")).toBeDefined();
  });
});
