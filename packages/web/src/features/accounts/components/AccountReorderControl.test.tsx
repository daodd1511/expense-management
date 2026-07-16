import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/core/types";
import { AccountReorderControl } from "./AccountReorderControl";

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "accounts.reorder": "Reorder",
        "accounts.reorderTitle": "Reorder accounts",
        "accounts.reorderDescription": "Drag each Account to change its display order.",
        "accounts.reorderSave": "Save",
        "form.cancel": "Cancel",
      })[key] ?? key,
  }),
}));
vi.mock("./AccountReorderList", () => ({
  AccountReorderList: ({
    accounts,
    onReorder,
  }: {
    accounts: readonly Account[];
    onReorder: (accountIds: string[]) => void;
  }) => (
    <div>
      <span>{accounts.map((account) => account.name).join(", ")}</span>
      <button
        type="button"
        onClick={() => onReorder([...accounts].reverse().map((account) => account.id))}
      >
        Reverse draft
      </button>
    </div>
  ),
}));

const accounts: Account[] = [
  { id: "cash", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 0 },
  { id: "bank", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 1 },
];

describe("AccountReorderControl", () => {
  it("keeps desktop reordering local until Save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountReorderControl
        variant="desktop"
        accounts={accounts}
        onSave={onSave}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Reorder" });
    expect(trigger.querySelector("svg")).toBeNull();
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Reorder accounts" })).toBeDefined();
    expect(screen.getByText("Cash, Bank")).toBeDefined();
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await user.click(screen.getByRole("button", { name: "Reverse draft" }));

    expect(screen.getByText("Bank, Cash")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(["bank", "cash"]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("isolates an open mobile draft from background updates and discards it on Cancel", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <AccountReorderControl variant="mobile" accounts={accounts} onSave={onSave} />,
    );

    await user.click(screen.getByRole("button", { name: "Reorder" }));

    const dialog = screen.getByRole("dialog", { name: "Reorder accounts" });
    expect(dialog.className).toContain("rounded-t-3xl");
    rerender(
      <AccountReorderControl
        variant="mobile"
        accounts={[accounts[1], accounts[0]]}
        onSave={onSave}
      />,
    );
    expect(screen.getByText("Cash, Bank")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Reverse draft" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Reorder" }));
    expect(screen.getByText("Bank, Cash")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Reverse draft" }));
    const backdrop = document.querySelector<HTMLDivElement>('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLDivElement);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });
});
