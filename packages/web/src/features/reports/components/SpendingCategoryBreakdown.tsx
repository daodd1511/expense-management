import { useState } from "react";
import type { SpendingCategoryAggregate, SpendingCategoryChildAggregate } from "@wallet/shared";
import type { Category, Account } from "@/core/types";
import { useLang } from "@/core/i18n";
import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { formatVND } from "@/shared/lib/format";
import { ReportTransactionRow as TransactionRow } from "./ReportTransactionRow";
import { SpendingChangeBadge } from "./SpendingChangeBadge";

type CategoryLookup = (id: string | null | undefined) => Category | undefined;
type AccountLookup = (id: string | null | undefined) => Account | undefined;
type TransactionClick = (transactionId: string, date: string) => void;

/**
 * Parent-first Spending breakdown (PLAN.md -> "Decisions"): a distinct component from
 * ExpenseCategoryBreakdown rather than an extension of it — the data shape here nests
 * children under each parent and carries current/previous/change/share instead of a
 * flat amount/percentage, and `categoryId` can be null for the explicit Uncategorized
 * bucket, none of which the existing single-level component's props express.
 */
export function SpendingCategoryBreakdown({
  categories,
  getCategory,
  getAccount,
  onTransactionClick,
}: {
  categories: SpendingCategoryAggregate[];
  getCategory: CategoryLookup;
  getAccount: AccountLookup;
  onTransactionClick: TransactionClick;
}) {
  const { t } = useLang();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  if (categories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-40 flex-col items-start justify-center gap-2 p-6">
          <p className="text-sm font-medium">{t("reports.spendingEmptyTitle")}</p>
          <p className="max-w-xl text-sm text-muted-foreground">{t("reports.spendingEmptyDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  const sortedCategories = [...categories].sort((left, right) => right.current - left.current);

  const toggle = (id: string, open: boolean) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle>{t("reports.spendingCategoriesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sortedCategories.map((category) => {
          const key = category.categoryId ?? "uncategorized";
          const categoryInfo = getCategory(category.categoryId);
          const icon = categoryInfo?.icon;
          const color = categoryInfo ? colorVar(categoryInfo.color) : "var(--muted-foreground)";
          const name = category.categoryId
            ? (categoryInfo?.name ?? category.categoryId)
            : t("reports.spendingUncategorized");
          const hasDrilldown = category.children.length > 0 || category.transactions.length > 0;
          const isOpen = expandedIds.has(key);

          return (
            <Collapsible key={key} open={isOpen} onOpenChange={(open) => toggle(key, open)}>
              <CollapsibleTrigger className="px-3 py-3" disabled={!hasDrilldown}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: color }}
                  >
                    <CategoryIcon name={icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("reports.categoryTransactions", { n: category.transactionCount })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm font-semibold">
                      {formatVND(category.current)}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(category.share * 100)}%
                      </span>
                      <SpendingChangeBadge
                        change={category.change}
                        changePercentage={category.changePercentage}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              {hasDrilldown && (
                <CollapsiblePanel className="pt-2">
                  <div className="space-y-1 border-l border-border pl-4">
                    {category.transactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        accountName={
                          getAccount(transaction.accountId)?.name ?? transaction.accountId
                        }
                        onClick={() => onTransactionClick(transaction.id, transaction.date)}
                      />
                    ))}
                    {category.children.map((child) => (
                      <SpendingChildCategoryRow
                        key={child.categoryId}
                        child={child}
                        getCategory={getCategory}
                        getAccount={getAccount}
                        onTransactionClick={onTransactionClick}
                      />
                    ))}
                  </div>
                </CollapsiblePanel>
              )}
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SpendingChildCategoryRow({
  child,
  getCategory,
  getAccount,
  onTransactionClick,
}: {
  child: SpendingCategoryChildAggregate;
  getCategory: CategoryLookup;
  getAccount: AccountLookup;
  onTransactionClick: TransactionClick;
}) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const categoryInfo = getCategory(child.categoryId);
  const icon = categoryInfo?.icon;
  const color = categoryInfo ? colorVar(categoryInfo.color) : "var(--muted-foreground)";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="px-3 py-2.5" disabled={child.transactions.length === 0}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon name={icon} className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{categoryInfo?.name ?? child.categoryId}</p>
            <p className="text-xs text-muted-foreground">
              {t("reports.categoryTransactions", { n: child.transactionCount })}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular-nums text-sm font-semibold">{formatVND(child.current)}</p>
            <SpendingChangeBadge change={child.change} changePercentage={child.changePercentage} />
          </div>
        </div>
      </CollapsibleTrigger>
      {child.transactions.length > 0 && (
        <CollapsiblePanel className="pt-2">
          <div className="space-y-1 border-l border-border pl-4">
            {child.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                accountName={getAccount(transaction.accountId)?.name ?? transaction.accountId}
                onClick={() => onTransactionClick(transaction.id, transaction.date)}
              />
            ))}
          </div>
        </CollapsiblePanel>
      )}
    </Collapsible>
  );
}
