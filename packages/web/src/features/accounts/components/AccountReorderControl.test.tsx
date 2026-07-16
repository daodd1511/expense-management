import { render, screen } from "@testing-library/react";
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
        "accounts.reorderDone": "Done",
      })[key] ?? key,
  }),
}));
vi.mock("./AccountReorderList", () => ({
  AccountReorderList: ({ accounts }: { accounts: readonly Account[] }) => (
    <div>{accounts.map((account) => account.name).join(", ")}</div>
  ),
}));

const accounts: Account[] = [
  { id: "cash", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 0 },
  { id: "bank", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 1 },
];

describe("AccountReorderControl", () => {
  it("opens a desktop dialog from a text-only Reorder button", async () => {
    const user = userEvent.setup();
    render(
      <AccountReorderControl
        variant="desktop"
        accounts={accounts}
        onReorder={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Reorder" });
    expect(trigger.querySelector("svg")).toBeNull();
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Reorder accounts" })).toBeDefined();
    expect(screen.getByText("Cash, Bank")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the mobile reorder flow in a bottom sheet", async () => {
    const user = userEvent.setup();
    render(
      <AccountReorderControl variant="mobile" accounts={accounts} onReorder={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Reorder" }));

    const dialog = screen.getByRole("dialog", { name: "Reorder accounts" });
    expect(dialog.className).toContain("rounded-t-3xl");
  });
});
