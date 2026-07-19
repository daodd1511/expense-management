import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "@/core/types";
import { AccountReorderList } from "./AccountReorderList";

const dndMocks = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: unknown) => void) | undefined,
  isSortable: vi.fn(),
  useSortable: vi.fn(),
}));

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: unknown) => void;
  }) => {
    dndMocks.onDragEnd = onDragEnd;
    return <>{children}</>;
  },
}));
vi.mock("@dnd-kit/react/sortable", () => ({
  isSortable: dndMocks.isSortable,
  useSortable: dndMocks.useSortable,
}));
vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (_key: string, vars?: Record<string, string>) => `Drag ${vars?.account} to reorder`,
  }),
}));

const accounts: Account[] = [
  { id: "cash", name: "Cash", kind: "cash", openingBalance: 0, displayOrder: 0 },
  { id: "bank", name: "Bank", kind: "bank", openingBalance: 0, displayOrder: 1 },
];

describe("AccountReorderList", () => {
  beforeEach(() => {
    dndMocks.onDragEnd = undefined;
    dndMocks.isSortable.mockReturnValue(true);
    dndMocks.useSortable.mockReturnValue({
      ref: vi.fn(),
      handleRef: vi.fn(),
      isDragSource: false,
      isDropping: false,
    });
  });

  it("shows one animated sortable row and drag handle per Account", () => {
    render(<AccountReorderList accounts={accounts} onReorder={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Drag Cash to reorder" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Drag Bank to reorder" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Move .* (up|down)/ })).toBeNull();
    expect(dndMocks.useSortable).toHaveBeenCalledWith(
      expect.objectContaining({
        transition: {
          duration: 240,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          idle: true,
        },
      }),
    );
  });

  it("persists the final dnd-kit sortable order", () => {
    const onReorder = vi.fn();
    render(<AccountReorderList accounts={accounts} onReorder={onReorder} />);

    act(() => {
      dndMocks.onDragEnd?.({
        canceled: false,
        operation: { source: { initialIndex: 0, index: 1 } },
      });
    });

    expect(onReorder).toHaveBeenCalledWith(["bank", "cash"]);
  });
});
