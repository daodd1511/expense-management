import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function Harness({ shortcuts }: { shortcuts: Parameters<typeof useKeyboardShortcuts>[0] }) {
  useKeyboardShortcuts(shortcuts);
  return null;
}

function dispatchKey(
  key: string,
  options: Partial<KeyboardEventInit> = {},
  target: EventTarget = document,
) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts", () => {
  it("fires a plain-key shortcut when nothing is focused", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "n", handler }]} />);

    act(() => {
      dispatchKey("n");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores a plain-key shortcut while typing into an input", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "n", handler }]} />);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      dispatchKey("n", {}, input);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores a plain-key shortcut while typing into a textarea", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "/", handler }]} />);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      dispatchKey("/", {}, textarea);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("fires a meta shortcut even while typing into an input", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "k", meta: true, handler }]} />);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      dispatchKey("k", { metaKey: true }, input);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire a meta shortcut without the modifier held", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "k", meta: true, handler }]} />);

    act(() => {
      dispatchKey("k");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("matches keys case-insensitively", () => {
    const handler = vi.fn();
    render(<Harness shortcuts={[{ key: "n", handler }]} />);

    act(() => {
      dispatchKey("N");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
