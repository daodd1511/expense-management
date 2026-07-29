import { AlertTriangle } from "lucide-react";
import { useLang } from "@/core/i18n";
import { useAccounts } from "@/features/accounts/queries";
import { underfundedAccounts } from "@/features/subscriptions/helpers";
import { useSubscriptions } from "@/features/subscriptions/queries";
import { formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

/**
 * Warns when an Account's Computed balance falls short of the Subscription charges due
 * against it inside the funding horizon. Renders `null` when every Account is funded, and
 * offers no dismiss control — the warning clears when the condition clears.
 */
export function LowBalanceBanner() {
  const { data: accounts = [] } = useAccounts();
  const { data: subscriptions = [] } = useSubscriptions();
  const { t } = useLang();

  const underfunded = underfundedAccounts(accounts, subscriptions);

  if (underfunded.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-expense/30 bg-expense-muted px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-expense" />
        <p className="text-sm font-semibold text-foreground">
          {underfunded.length === 1
            ? t("sub.lowBalanceSingle", { name: underfunded[0].account.name })
            : t("sub.lowBalanceTitle", { n: underfunded.length })}
        </p>
      </div>

      <div className={cn("mt-2 flex flex-col gap-1.5", underfunded.length > 1 && "mt-3")}>
        {underfunded.map(({ account, shortfall }) => (
          <div key={account.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{account.name}</span>
            <span className="tabular text-sm font-medium text-expense">
              {t("sub.lowBalanceShortfall", { amount: formatVND(shortfall) })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
