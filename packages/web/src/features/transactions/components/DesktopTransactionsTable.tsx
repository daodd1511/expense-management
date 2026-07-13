import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Paperclip,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccounts, useAccountLookup } from "@/features/accounts/queries";
import { useCategories, useCategoryLookup } from "@/features/categories/queries";
import { CategoryFilterSelect } from "@/features/categories/components/CategoryFilterSelect";
import { TransactionsMonthSwitcher } from "@/features/transactions/components/TransactionsMonthSwitcher";
import { TransactionMultiFilterSelect } from "@/features/transactions/components/TransactionMultiFilterSelect";
import { useDeleteTransactions, useTransactions } from "@/features/transactions/queries";
import { getTransactionBalanceLines } from "@/features/transactions/balance-lines";
import {
  matchesTransactionSelection,
  type TransactionFilterType,
} from "@/features/transactions/view-state";
import { useLang } from "@/core/i18n";
import type { Category, Transaction } from "@/core/types";
import { CategoryBreadcrumb } from "@/features/categories/components/CategoryBreadcrumb";
import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { TransactionsSkeleton } from "@/shared/components/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { amountColorClass, formatShortDate, formatSigned } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

const PAGE_SIZE = 9;

type TransactionRow = {
  id: string;
  transaction: Transaction;
  dateLabel: string;
  timeLabel?: string;
  categoryLabel: string;
  category?: Category;
  parentCategory?: Category;
  noteLabel?: string;
  categoryIcon?: string;
  categoryColor: string;
  accountLabel: string;
};

function getTransactionCategoryLabel({
  transaction,
  categoryName,
  transferLabel,
}: {
  transaction: Transaction;
  categoryName?: string;
  transferLabel: string;
}) {
  return transaction.type === "transfer" ? transferLabel : (categoryName ?? "");
}

export function DesktopTransactionsTable({
  onEdit,
  month,
  query,
  type,
  categoryIds,
  accountIds,
  onMonthChange,
  onQueryChange,
  onTypeChange,
  onCategoryChange,
  onAccountChange,
  shouldFocusSearch = false,
  onSearchFocusHandled,
}: {
  onEdit: (tx: Transaction) => void;
  month: string;
  query: string;
  type: TransactionFilterType;
  categoryIds: string[];
  accountIds: string[];
  onMonthChange: (month: string) => void;
  onQueryChange: (query: string) => void;
  onTypeChange: (type: TransactionFilterType) => void;
  onCategoryChange: (categoryIds: string[]) => void;
  onAccountChange: (accountIds: string[]) => void;
  shouldFocusSearch?: boolean;
  onSearchFocusHandled?: () => void;
}) {
  const { data: transactions = [], isPending: transactionsPending } = useTransactions(month);
  const { data: categories = [], isPending: categoriesPending } = useCategories();
  const { data: accounts = [], isPending: accountsPending } = useAccounts();
  const getCategory = useCategoryLookup();
  const getAccount = useAccountLookup();
  const deleteTxs = useDeleteTransactions();
  const { t } = useLang();
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const balanceAccountId = accountIds.length === 1 ? accountIds[0] : undefined;

  const typeFilters: { value: TransactionFilterType; label: string }[] = [
    { value: "all", label: t("tx.filterAll") },
    { value: "expense", label: t("tx.filterExpense") },
    { value: "income", label: t("tx.filterIncome") },
    { value: "transfer", label: t("tx.filterTransfer") },
  ];

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (type !== "all" && tx.type !== type) return false;
        if (!matchesTransactionSelection(tx, categoryIds, accountIds)) return false;
        if (query) {
          const searchValue = query.toLowerCase();
          const haystack = [
            tx.merchant,
            tx.note,
            getCategory(tx.categoryId)?.name,
            getAccount(tx.accountId)?.name,
            getAccount(tx.toAccountId)?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchValue)) return false;
        }
        return true;
      })
      .map<TransactionRow>((tx) => {
        const category = getCategory(tx.categoryId);
        const parentCategory = category?.parentId ? getCategory(category.parentId) : undefined;

        return {
          id: tx.id,
          transaction: tx,
          dateLabel: formatShortDate(tx.date),
          timeLabel: tx.time,
          categoryLabel: getTransactionCategoryLabel({
            transaction: tx,
            categoryName: category?.name,
            transferLabel: t("tx.transfer"),
          }),
          category,
          parentCategory,
          noteLabel: tx.note?.trim() || undefined,
          categoryIcon: category?.icon,
          categoryColor: category?.color ?? "chart-1",
          accountLabel: getAccount(tx.accountId)?.name ?? "",
        };
      });
  }, [transactions, type, categoryIds, accountIds, query, getCategory, getAccount, t]);

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "dateLabel",
        id: "date",
        sortingFn: (a, b) => a.original.transaction.date.localeCompare(b.original.transaction.date),
        header: ({ column }) => (
          <SortHeader
            label={t("tx.colDate")}
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="flex flex-col tabular whitespace-nowrap text-muted-foreground">
            <span>{row.original.dateLabel}</span>
            {row.original.timeLabel && <span className="text-xs">{row.original.timeLabel}</span>}
          </span>
        ),
      },
      {
        accessorKey: "categoryLabel",
        id: "category",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortHeader
            label={t("tx.colCategory")}
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const tx = row.original.transaction;

          if (tx.type === "transfer") {
            return (
              <span className="inline-flex items-center gap-1.5 text-transfer">
                <ArrowLeftRight className="size-3.5" /> {t("tx.transfer")}
              </span>
            );
          }

          return (
            <span className="flex max-w-[14rem] min-w-0 items-start gap-1.5">
              <CategoryIcon
                name={row.original.categoryIcon}
                className="mt-0.5 size-3.5 shrink-0"
                style={{ color: colorVar(row.original.categoryColor) }}
              />
              <CategoryBreadcrumb
                category={row.original.category}
                parentCategory={row.original.parentCategory}
                trailing={
                  tx.receipt && <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                }
              />
            </span>
          );
        },
      },
      {
        accessorKey: "noteLabel",
        id: "description",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortHeader
            label={t("tx.colDescription")}
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="block max-w-[20rem] truncate text-muted-foreground">
            {row.original.noteLabel ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "accountLabel",
        id: "account",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortHeader
            label={t("tx.colAccount")}
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.accountLabel}</span>
        ),
      },
      {
        accessorKey: "amount",
        id: "amount",
        sortingFn: (a, b) => a.original.transaction.amount - b.original.transaction.amount,
        header: ({ column }) => (
          <SortHeader
            label={t("tx.colAmount")}
            sorted={column.getIsSorted()}
            align="right"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="flex flex-col items-end text-right">
            <span
              className={cn(
                "block tabular font-semibold",
                amountColorClass(row.original.transaction.type),
              )}
            >
              {formatSigned(row.original.transaction.amount, row.original.transaction.type)}
            </span>
            {getTransactionBalanceLines(
              row.original.transaction,
              balanceAccountId,
              (accountId) => getAccount(accountId)?.name,
            ).map((balance) => (
              <span key={balance} className="text-xs tabular text-muted-foreground">
                {balance}
              </span>
            ))}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(row.original.transaction)}
              aria-label={t("tx.edit")}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteIds([row.original.transaction.id])}
              aria-label={t("tx.deleteOne")}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-expense-muted hover:text-expense"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [balanceAccountId, getAccount, onEdit, t],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleConfirmDelete = async () => {
    await deleteTxs.mutateAsync(pendingDeleteIds);
    setPendingDeleteIds([]);
  };

  useEffect(() => {
    if (!shouldFocusSearch) return;
    searchRef.current?.focus();
    searchRef.current?.select();
    onSearchFocusHandled?.();
  }, [shouldFocusSearch, onSearchFocusHandled]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [month, query, type, categoryIds, accountIds]);

  if (transactionsPending || categoriesPending || accountsPending) {
    return <TransactionsSkeleton />;
  }

  const pageCount = Math.max(1, table.getPageCount());
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <TransactionsMonthSwitcher month={month} onChange={onMonthChange} />
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            data-global-search="transactions"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            placeholder={t("tx.search")}
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <CategoryFilterSelect
            categories={categories}
            values={categoryIds}
            ariaLabel={t("tx.filterCategory")}
            emptyLabel={t("tx.filterCategoryAll")}
            selectedLabel={(count) => t("tx.filterSelected", { n: count })}
            onChange={onCategoryChange}
          />
        </div>
        <div className="w-44">
          <TransactionMultiFilterSelect
            values={accountIds}
            ariaLabel={t("tx.filterAccount")}
            emptyLabel={t("tx.filterAccountAll")}
            selectedLabel={(count) => t("tx.filterSelected", { n: count })}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            onChange={onAccountChange}
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {typeFilters.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => {
                onTypeChange(filterOption.value);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                type === filterOption.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {t("tx.count", { n: filtered.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40 text-xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn(header.id === "actions" && "w-20")}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t("tx.notFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("tx.page", { n: currentPage, total: pageCount })}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-3.5" /> {t("tx.pagePrev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            {t("tx.pageNext")} <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function SortHeader({
  label,
  sorted,
  onClick,
  align = "left",
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <div className={cn(align === "right" && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "ml-auto",
        )}
      >
        {label}
        {sorted ? (
          sorted === "asc" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )
        ) : (
          <ChevronDown className="size-3.5 opacity-40" />
        )}
      </button>
    </div>
  );
}
