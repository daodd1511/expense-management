import { ArrowLeftRight, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useSwipeActions } from "@/shared/hooks/useSwipeActions";
import { amountColorClass, formatSigned } from "@/shared/lib/format";
import { useLang } from "@/core/i18n";
import { useCategoryLookup } from "@/features/categories/queries";
import { CategoryBreadcrumb } from "@/features/categories/components/CategoryBreadcrumb";
import { useAccountLookup } from "@/features/accounts/queries";
import { useDeleteTransaction } from "@/features/transactions/queries";
import { getTransactionBalanceLines } from "@/features/transactions/balance-lines";
import type { Transaction } from "@/core/types";
import { cn } from "@/shared/lib/utils";

const SWIPE_ACTION_WIDTH = 132;

function Leading({ tx }: { tx: Transaction }) {
  const getCategory = useCategoryLookup();
  if (tx.type === "transfer") {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-transfer">
        <ArrowLeftRight className="size-4" />
      </span>
    );
  }
  const cat = getCategory(tx.categoryId);
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={{
        backgroundColor: `color-mix(in oklab, ${colorVar(cat?.color ?? "chart-1")} 16%, transparent)`,
      }}
    >
      <CategoryIcon
        name={cat?.icon}
        className="size-4"
        style={{ color: colorVar(cat?.color ?? "chart-1") }}
      />
    </span>
  );
}

export function TransactionRow({
  tx,
  balanceAccountId,
  onClick,
  swipe = false,
}: {
  tx: Transaction;
  balanceAccountId?: string;
  onClick?: () => void;
  swipe?: boolean;
}) {
  const getCategory = useCategoryLookup();
  const getAccount = useAccountLookup();
  const deleteTx = useDeleteTransaction();
  const { t } = useLang();
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const cat = getCategory(tx.categoryId);
  const parentCat = cat?.parentId ? getCategory(cat.parentId) : undefined;
  const acc = getAccount(tx.accountId);
  const note = tx.note?.trim() || undefined;
  const accountLine =
    tx.type === "transfer" ? `${acc?.name} → ${getAccount(tx.toAccountId)?.name}` : acc?.name;
  const subtitle = [accountLine, note].filter(Boolean).join(" · ") || undefined;
  const balanceLines = getTransactionBalanceLines(
    tx,
    balanceAccountId,
    (accountId) => getAccount(accountId)?.name,
  );

  const content = (
    <div
      className={cn("flex items-center gap-3 bg-card px-1 py-2.5", swipe && "touch-pan-y")}
      style={
        swipe
          ? {
              transform: `translateX(${offset}px)`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }
          : undefined
      }
      onTouchStart={swipe ? bind.onTouchStart : undefined}
      onTouchMove={swipe ? bind.onTouchMove : undefined}
      onTouchEnd={swipe ? bind.onTouchEnd : undefined}
      onTouchCancel={swipe ? bind.onTouchCancel : undefined}
    >
      <Leading tx={tx} />
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 flex-col">
          {tx.type === "transfer" ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {t("tx.transfer")}
              </span>
              {tx.receipt && <Paperclip className="size-3 shrink-0 text-muted-foreground" />}
            </span>
          ) : (
            <CategoryBreadcrumb
              category={cat}
              parentCategory={parentCat}
              trailing={
                tx.receipt && <Paperclip className="size-3 shrink-0 text-muted-foreground" />
              }
            />
          )}
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn("tabular text-sm font-semibold", amountColorClass(tx.type))}>
            {formatSigned(tx.amount, tx.type)}
          </span>
          {balanceLines.map((balance) => (
            <span key={balance} className="text-xs tabular text-muted-foreground">
              {balance}
            </span>
          ))}
        </span>
      </button>
    </div>
  );

  if (!swipe) return content;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onClick}
          aria-label="Sửa"
          className="flex w-16 items-center justify-center bg-accent text-accent-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          aria-label="Xóa"
          className="flex w-16 items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {content}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await deleteTx.mutateAsync(tx.id);
          setConfirmDeleteOpen(false);
        }}
      />
    </div>
  );
}
