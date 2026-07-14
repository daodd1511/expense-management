import { ArrowLeftRight, HandCoins, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useSwipeActions } from "@/shared/hooks/useSwipeActions";
import { useLang } from "@/core/i18n";
import { useCategoryLookup } from "@/features/categories/queries";
import { CategoryBreadcrumb } from "@/features/categories/components/CategoryBreadcrumb";
import { useAccountLookup } from "@/features/accounts/queries";
import { useDeleteTransaction } from "@/features/transactions/queries";
import { useLoanEventLinkLookup } from "@/features/loans/queries";
import {
  loanTransactionLabelKey,
  transactionAmountClass,
  transactionAmountLabel,
} from "@/features/transactions/loan-transaction";
import {
  getTransactionBalanceEntries,
  type TransactionBalanceEntry,
} from "@/features/transactions/balance-lines";
import type { Transaction } from "@/core/types";
import { cn } from "@/shared/lib/utils";

const SWIPE_ACTION_WIDTH = 132;

type TransactionBalancePair = [TransactionBalanceEntry, TransactionBalanceEntry];

function isBalancePair(entries: TransactionBalanceEntry[]): entries is TransactionBalancePair {
  return entries.length === 2;
}

function TransferBalanceStrip({ entries }: { entries: TransactionBalancePair }) {
  const [source, destination] = entries;

  return (
    <span className="col-span-2 mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[10px] leading-tight text-muted-foreground">
          {source.accountName}
        </span>
        <span className="whitespace-nowrap text-xs font-medium tabular text-foreground">
          {source.formattedAmount}
        </span>
      </span>
      <ArrowLeftRight className="size-3 shrink-0 text-transfer" />
      <span className="flex min-w-0 flex-col items-end text-right">
        <span className="max-w-full truncate text-[10px] leading-tight text-muted-foreground">
          {destination.accountName}
        </span>
        <span className="whitespace-nowrap text-xs font-medium tabular text-foreground">
          {destination.formattedAmount}
        </span>
      </span>
    </span>
  );
}

function Leading({ tx }: { tx: Transaction }) {
  const getCategory = useCategoryLookup();
  if (tx.type === "transfer") {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-transfer">
        <ArrowLeftRight className="size-4" />
      </span>
    );
  }
  if (tx.type === "loan") {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <HandCoins className="size-4" />
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
  onOpenLoan,
  swipe = false,
  compact = false,
}: {
  tx: Transaction;
  balanceAccountId?: string;
  onClick?: () => void;
  onOpenLoan?: (loanId: string) => void;
  swipe?: boolean;
  compact?: boolean;
}) {
  const getCategory = useCategoryLookup();
  const getAccount = useAccountLookup();
  const getLoanEventLink = useLoanEventLinkLookup();
  const deleteTx = useDeleteTransaction();
  const { t } = useLang();
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const cat = getCategory(tx.categoryId);
  const parentCat = cat?.parentId ? getCategory(cat.parentId) : undefined;
  const acc = getAccount(tx.accountId);
  const note = tx.note?.trim() || undefined;
  const loanLink = getLoanEventLink(tx.loanEventId);
  const handleOpen = tx.type === "loan" && loanLink ? () => onOpenLoan?.(loanLink.loanId) : onClick;
  const balanceEntries = getTransactionBalanceEntries(
    tx,
    balanceAccountId,
    (accountId) => getAccount(accountId)?.name,
  );
  const transferBalancePair =
    tx.type === "transfer" && isBalancePair(balanceEntries) ? balanceEntries : undefined;
  const accountLine =
    tx.type === "transfer" ? `${acc?.name} → ${getAccount(tx.toAccountId)?.name}` : acc?.name;
  const subtitle =
    [loanLink?.personName, transferBalancePair ? undefined : accountLine, note]
      .filter(Boolean)
      .join(" · ") || undefined;
  const compactSubtitle =
    [cat?.name, transferBalancePair ? undefined : accountLine].filter(Boolean).join(" · ") ||
    undefined;

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
        onClick={handleOpen}
        className={cn(
          "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center text-left",
          compact ? "gap-x-2" : "gap-x-3",
        )}
      >
        <span className="flex min-w-0 flex-col">
          {tx.type === "transfer" ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {t("tx.transfer")}
              </span>
              {tx.receipt && <Paperclip className="size-3 shrink-0 text-muted-foreground" />}
            </span>
          ) : tx.type === "loan" ? (
            <span className="truncate text-sm font-semibold text-foreground">
              {t(loanTransactionLabelKey(loanLink))}
            </span>
          ) : compact ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground" title={tx.merchant}>
                {tx.merchant}
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
          {(compact ? compactSubtitle : subtitle) && (
            <span className="truncate text-xs text-muted-foreground">
              {compact ? compactSubtitle : subtitle}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end self-start">
          <span
            className={cn(
              "tabular whitespace-nowrap font-semibold",
              compact ? "text-[0.8125rem]" : "text-sm",
              transactionAmountClass(tx),
            )}
          >
            {transactionAmountLabel(tx)}
          </span>
          {!transferBalancePair &&
            balanceEntries.map((balance) => (
              <span
                key={balance.accountId}
                className="whitespace-nowrap text-xs tabular text-muted-foreground"
              >
                {balance.formattedAmount}
              </span>
            ))}
        </span>
        {transferBalancePair && <TransferBalanceStrip entries={transferBalancePair} />}
      </button>
    </div>
  );

  if (!swipe || tx.type === "loan") return content;

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
