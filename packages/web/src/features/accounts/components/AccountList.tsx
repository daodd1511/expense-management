import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatVND } from "@/shared/lib/format";
import { useLang } from "@/core/i18n";
import { useAccounts } from "@/features/accounts/queries";
import type { AccountKind } from "@/core/types";
import { cn } from "@/shared/lib/utils";

export function AccountList({ className, limit }: { className?: string; limit?: number }) {
  const { data: accounts = [] } = useAccounts();
  const { t } = useLang();
  const visibleAccounts = limit ? accounts.slice(0, limit) : accounts;

  const KIND: Record<AccountKind, { icon: LucideIcon; label: string }> = {
    cash: { icon: Banknote, label: t("accounts.kindCash") },
    bank: { icon: Landmark, label: t("accounts.kindBank") },
    card: { icon: CreditCard, label: t("accounts.kindCard") },
    ewallet: { icon: Wallet, label: t("accounts.kindEwallet") },
  };

  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {visibleAccounts.map((a) => {
        const meta = KIND[a.kind];
        const Icon = meta.icon;
        const bal = a.balance ?? a.openingBalance;
        const negative = bal < 0;
        return (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium" title={a.name}>
                  {a.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">{meta.label}</span>
              </div>
            </div>
            <span
              title={`${negative ? "−" : ""}${formatVND(Math.abs(bal))}`}
              className={cn(
                "tabular shrink-0 whitespace-nowrap text-right text-[0.8125rem] font-semibold",
                negative ? "text-expense" : "text-foreground",
              )}
            >
              {negative ? "−" : ""}
              {formatVND(Math.abs(bal))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
