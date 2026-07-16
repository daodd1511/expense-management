import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useLang } from "@/core/i18n";
import type { Account } from "@/core/types";

type MoveDirection = "up" | "down";

export interface AccountReorderControls {
  dragHandle: ReactNode;
  moveButtons: ReactNode;
}

interface DragState {
  accountId: string;
  accountIds: string[];
}

function moveAccount(accountIds: readonly string[], accountId: string, targetIndex: number) {
  const sourceIndex = accountIds.indexOf(accountId);
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= accountIds.length) {
    return [...accountIds];
  }

  const nextIds = [...accountIds];
  nextIds.splice(sourceIndex, 1);
  nextIds.splice(targetIndex, 0, accountId);
  return nextIds;
}

/** Renders Account content with shared pointer, keyboard, focus, and announcement behavior. */
export function AccountReorderList({
  accounts,
  onReorder,
  renderAccount,
  className,
  itemClassName,
  disabled = false,
}: {
  accounts: readonly Account[];
  onReorder: (accountIds: string[]) => void;
  renderAccount: (account: Account, controls: AccountReorderControls) => ReactNode;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const accountIds = accounts.map((account) => account.id);
  const accountKey = accountIds.join("\u0000");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const controlRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setPendingOrder(null);
  }, [accountKey]);

  const visibleIds = dragState?.accountIds ?? pendingOrder ?? accountIds;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const visibleAccounts = visibleIds
    .map((id) => accountById.get(id))
    .filter((account): account is Account => account !== undefined);

  const announceMove = (account: Account, nextIds: readonly string[]) => {
    setAnnouncement(
      t("accounts.moved", {
        account: account.name,
        position: nextIds.indexOf(account.id) + 1,
        count: nextIds.length,
      }),
    );
  };

  const commitOrder = (account: Account, nextIds: string[]) => {
    if (nextIds.every((id, index) => id === accountIds[index])) return;
    setPendingOrder(nextIds);
    announceMove(account, nextIds);
    onReorder(nextIds);
  };

  const focusMovedAccount = (
    accountId: string,
    direction: MoveDirection,
    targetIndex: number,
  ) => {
    const fallbackDirection: MoveDirection = direction === "up" ? "down" : "up";
    const focusDirection =
      targetIndex === 0 || targetIndex === accountIds.length - 1 ? fallbackDirection : direction;
    window.requestAnimationFrame(() => {
      controlRefs.current.get(`${accountId}:${focusDirection}`)?.focus();
    });
  };

  const handleMove = (account: Account, direction: MoveDirection) => {
    const sourceIndex = visibleIds.indexOf(account.id);
    const targetIndex = sourceIndex + (direction === "up" ? -1 : 1);
    const nextIds = moveAccount(visibleIds, account.id, targetIndex);
    commitOrder(account, nextIds);
    focusMovedAccount(account.id, direction, targetIndex);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, accountId: string) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ accountId, accountIds: [...visibleIds] });
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-account-reorder-id]");
    const targetId = target?.dataset.accountReorderId;
    if (!targetId || targetId === dragState.accountId) return;

    const targetIndex = dragState.accountIds.indexOf(targetId);
    setDragState({
      ...dragState,
      accountIds: moveAccount(dragState.accountIds, dragState.accountId, targetIndex),
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>, account: Account) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    commitOrder(account, dragState.accountIds);
    setDragState(null);
  };

  return (
    <>
      <div className={className} role="list">
        {visibleAccounts.map((account, index) => {
          const dragHandle = (
            <button
              type="button"
              className="inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("accounts.reorderDrag", { account: account.name })}
              disabled={disabled}
              onPointerDown={(event) => handlePointerDown(event, account.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => handlePointerUp(event, account)}
              onPointerCancel={() => setDragState(null)}
              onClick={(event) => event.stopPropagation()}
            >
              <GripVertical className="size-4" />
            </button>
          );
          const moveButtons = (
            <span className="inline-flex items-center gap-0.5">
              {(["up", "down"] as const).map((direction) => {
                const unavailable = direction === "up" ? index === 0 : index === accounts.length - 1;
                return (
                  <button
                    key={direction}
                    ref={(node) => {
                      const key = `${account.id}:${direction}`;
                      if (node) controlRefs.current.set(key, node);
                      else controlRefs.current.delete(key);
                    }}
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t(direction === "up" ? "accounts.moveUp" : "accounts.moveDown", {
                      account: account.name,
                    })}
                    disabled={disabled || unavailable}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMove(account, direction);
                    }}
                  >
                    {direction === "up" ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <ArrowDown className="size-4" />
                    )}
                  </button>
                );
              })}
            </span>
          );

          return (
            <div
              key={account.id}
              className={itemClassName}
              role="listitem"
              data-account-reorder-id={account.id}
            >
              {renderAccount(account, { dragHandle, moveButtons })}
            </div>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  );
}
