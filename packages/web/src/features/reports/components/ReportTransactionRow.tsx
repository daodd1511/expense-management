import { amountColorClass, formatSigned, formatShortDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { ReportTransactionRow as ReportTransactionRowData } from "@wallet/shared";

export function ReportTransactionRow({
  transaction,
  accountName,
  onClick,
}: {
  transaction: ReportTransactionRowData;
  accountName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{transaction.merchant}</p>
        {transaction.note && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{transaction.note}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatShortDate(transaction.date)}</span>
          {accountName && <span>{accountName}</span>}
        </div>
      </div>
      <span
        className={cn("shrink-0 text-sm font-semibold tabular-nums", amountColorClass("expense"))}
      >
        {formatSigned(transaction.amount, "expense")}
      </span>
    </button>
  );
}
