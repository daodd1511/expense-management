import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette, type CommandPaletteAction } from "./CommandPalette";

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "palette.placeholder": "Search actions...",
        "palette.empty": "No actions found",
      })[key] ?? key,
  }),
}));

function makeActions(): CommandPaletteAction[] {
  return [
    { id: "nav-dashboard", label: "Dashboard", section: "Navigate", onRun: vi.fn() },
    { id: "nav-transactions", label: "Transactions", section: "Navigate", onRun: vi.fn() },
    { id: "create-account", label: "New account", section: "Create", onRun: vi.fn() },
  ];
}

function openPalette() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  });
}

describe("CommandPalette", () => {
  it("is closed until Cmd/Ctrl+K is pressed", () => {
    render(<CommandPalette actions={makeActions()} />);
    expect(screen.queryByPlaceholderText("Search actions...")).toBeNull();

    openPalette();

    expect(screen.getByPlaceholderText("Search actions...")).toBeDefined();
  });

  it("toggles closed on a second Cmd/Ctrl+K", () => {
    render(<CommandPalette actions={makeActions()} />);
    openPalette();
    expect(screen.getByPlaceholderText("Search actions...")).toBeDefined();

    openPalette();

    expect(screen.queryByPlaceholderText("Search actions...")).toBeNull();
  });

  it("filters actions by label as the user types", async () => {
    const user = userEvent.setup();
    render(<CommandPalette actions={makeActions()} />);
    openPalette();

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("New account")).toBeDefined();

    await user.type(screen.getByPlaceholderText("Search actions..."), "account");

    expect(screen.getByText("New account")).toBeDefined();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CommandPalette actions={makeActions()} />);
    openPalette();

    await user.type(screen.getByPlaceholderText("Search actions..."), "zzz-no-match");

    expect(screen.getByText("No actions found")).toBeDefined();
  });

  it("runs the clicked action and closes the palette", async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<CommandPalette actions={actions} />);
    openPalette();

    await user.click(screen.getByText("New account"));

    expect(actions[2].onRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText("Search actions...")).toBeNull();
  });

  it("runs the highlighted action on Enter", async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<CommandPalette actions={actions} />);
    openPalette();

    await user.type(screen.getByPlaceholderText("Search actions..."), "account");
    await user.keyboard("{Enter}");

    expect(actions[2].onRun).toHaveBeenCalledTimes(1);
  });

  it("moves the highlight with arrow keys before running on Enter", async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    render(<CommandPalette actions={actions} />);
    openPalette();

    // Default highlight is index 0 (Dashboard); arrow down once selects Transactions.
    await user.type(screen.getByPlaceholderText("Search actions..."), "{ArrowDown}{Enter}");

    expect(actions[1].onRun).toHaveBeenCalledTimes(1);
    expect(actions[0].onRun).not.toHaveBeenCalled();
  });
});
