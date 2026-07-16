import { GripVertical } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { useLang } from "@/core/i18n";
import type { Account } from "@/core/types";
import { cn } from "@/shared/lib/utils";

function moveAccount(accounts: readonly Account[], fromIndex: number, toIndex: number) {
  const reordered = [...accounts];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return reordered;
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

function SortableAccountRow({
  account,
  index,
  disabled,
}: {
  account: Account;
  index: number;
  disabled: boolean;
}) {
  const { t } = useLang();
  const { ref, handleRef, isDragSource, isDropping } = useSortable({
    id: account.id,
    index,
    disabled,
    transition: {
      duration: 240,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      idle: true,
    },
  });

  return (
    <div
      ref={ref}
      role="listitem"
      className={cn(
        "relative flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-[box-shadow,opacity,background-color] duration-200",
        isDragSource && "z-10 bg-accent/70 opacity-90 shadow-lg ring-2 ring-primary/30",
        isDropping && "shadow-md",
      )}
    >
      <span className="min-w-0 truncate text-sm font-medium">{account.name}</span>
      <button
        ref={handleRef}
        type="button"
        className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={t("accounts.reorderDrag", { account: account.name })}
        disabled={disabled}
      >
        <GripVertical className="size-5" />
      </button>
    </div>
  );
}

/** Sortable Account-name rows backed by dnd-kit's pointer, touch, and keyboard sensors. */
export function AccountReorderList({
  accounts,
  onReorder,
  disabled = false,
}: {
  accounts: readonly Account[];
  onReorder: (accountIds: string[]) => void;
  disabled?: boolean;
}) {
  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source) || source.initialIndex === source.index) return;

    const reordered = moveAccount(accounts, source.initialIndex, source.index);
    onReorder(reordered.map((account) => account.id));
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-2" role="list">
        {accounts.map((account, index) => (
          <SortableAccountRow
            key={account.id}
            account={account}
            index={index}
            disabled={disabled}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
