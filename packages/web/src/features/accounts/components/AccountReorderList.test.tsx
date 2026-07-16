import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/core/types";
import { AccountReorderList } from "./AccountReorderList";

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        "accounts.reorderDrag": `Drag ${vars?.account} to reorder`,
        "accounts.moveUp": `Move ${vars?.account} up`,
        "accounts.moveDown": `Move ${vars?.account} down`,
        "accounts.moved": `${vars?.account} moved to position ${vars?.position} of ${vars?.count}`,
      })[key] ?? key,
  }),
}));

const accounts: Account[] = [
  { id: "cash", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 0 },
  { id: "bank", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 1 },
];

function renderList(onReorder: (accountIds: string[]) => void) {
  return render(
    <AccountReorderList
      accounts={accounts}
      onReorder={onReorder}
      renderAccount={(account, controls) => (
        <div>
          <span>{account.name}</span>
          {controls.dragHandle}
          {controls.moveButtons}
        </div>
      )}
    />,
  );
}

describe("AccountReorderList", () => {
  it("moves with keyboard controls, announces position, and preserves focus", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    renderList(onReorder);

    await user.click(screen.getByRole("button", { name: "Move Bank up" }));

    expect(onReorder).toHaveBeenCalledWith(["bank", "cash"]);
    expect(screen.getByText("Bank moved to position 1 of 2")).toBeDefined();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move Bank down" })),
    );
  });

  it("reorders by pointer position through the drag handle", () => {
    const onReorder = vi.fn();
    renderList(onReorder);
    const bankItem = screen.getByText("Bank").closest("[data-account-reorder-id]");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn().mockReturnValue(bankItem),
    });
    const handle = screen.getByRole("button", { name: "Drag Cash to reorder" });

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 20 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 0, clientY: 20 });

    expect(onReorder).toHaveBeenCalledWith(["bank", "cash"]);
    expect(screen.getByText("Cash moved to position 2 of 2")).toBeDefined();
  });
});
