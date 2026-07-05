import { ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Paperclip, Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccounts, useAccountLookup } from '@/features/accounts/queries'
import { useCategories, useCategoryLookup } from '@/features/categories/queries'
import { CategoryFilterSelect } from '@/features/categories/components/CategoryFilterSelect'
import { TransactionsMonthSwitcher } from '@/features/transactions/components/TransactionsMonthSwitcher'
import { useDeleteTransactions, useTransactions } from '@/features/transactions/queries'
import type { TransactionFilterType } from '@/features/transactions/view-state'
import { useLang } from '@/core/i18n'
import type { Transaction } from '@/core/types'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { Input } from '@/shared/components/ui/input'
import { TransactionsSkeleton } from '@/shared/components/Skeleton'
import { Select, SelectItem, SelectPopup, SelectPortal, SelectPositioner, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { amountColorClass, formatShortDate, formatSigned } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

type SortKey = 'date' | 'category' | 'account' | 'amount'
const PAGE_SIZE = 9

function getTransactionCategoryLabel({
  transaction,
  categoryName,
  transferLabel,
}: {
  transaction: Transaction
  categoryName?: string
  transferLabel: string
}) {
  return transaction.type === 'transfer' ? transferLabel : categoryName ?? ''
}

export function DesktopTransactionsTable({
  onEdit,
  month,
  query,
  type,
  categoryId,
  accountId,
  onMonthChange,
  onQueryChange,
  onTypeChange,
  onCategoryChange,
  onAccountChange,
  shouldFocusSearch = false,
  onSearchFocusHandled,
}: {
  onEdit: (tx: Transaction) => void
  month: string
  query: string
  type: TransactionFilterType
  categoryId: string
  accountId: string
  onMonthChange: (month: string) => void
  onQueryChange: (query: string) => void
  onTypeChange: (type: TransactionFilterType) => void
  onCategoryChange: (categoryId: string) => void
  onAccountChange: (accountId: string) => void
  shouldFocusSearch?: boolean
  onSearchFocusHandled?: () => void
}) {
  const { data: transactions = [], isPending: transactionsPending } = useTransactions(month)
  const { data: categories = [], isPending: categoriesPending } = useCategories()
  const { data: accounts = [], isPending: accountsPending } = useAccounts()
  const getCategory = useCategoryLookup()
  const getAccount = useAccountLookup()
  const deleteTxs = useDeleteTransactions()
  const { t } = useLang()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [asc, setAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement | null>(null)

  const typeFilters: { value: TransactionFilterType; label: string }[] = [
    { value: 'all', label: t('tx.filterAll') },
    { value: 'expense', label: t('tx.filterExpense') },
    { value: 'income', label: t('tx.filterIncome') },
    { value: 'transfer', label: t('tx.filterTransfer') },
  ]

  const filtered = useMemo(() => {
    const rows = transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (categoryId && tx.categoryId !== categoryId) return false
      if (accountId && tx.accountId !== accountId) return false
      if (query) {
        const searchValue = query.toLowerCase()
        const haystack = [
          tx.merchant,
          tx.note,
          getCategory(tx.categoryId)?.name,
          getAccount(tx.accountId)?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(searchValue)) return false
      }
      return true
    })

    const direction = asc ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'category':
          return getTransactionCategoryLabel({
            transaction: a,
            categoryName: getCategory(a.categoryId)?.name,
            transferLabel: t('tx.transfer'),
          }).localeCompare(
            getTransactionCategoryLabel({
              transaction: b,
              categoryName: getCategory(b.categoryId)?.name,
              transferLabel: t('tx.transfer'),
            }),
          ) * direction
        case 'account':
          return (getAccount(a.accountId)?.name ?? '').localeCompare(getAccount(b.accountId)?.name ?? '') * direction
        case 'amount':
          return (a.amount - b.amount) * direction
        default:
          return a.date.localeCompare(b.date) * direction
      }
    })
  }, [transactions, type, categoryId, accountId, query, sortKey, asc, getCategory, getAccount, t])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAsc((currentAsc) => !currentAsc)
      return
    }

    setSortKey(key)
    setAsc(false)
  }

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))

  const handleToggleAll = () => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (allOnPageSelected) rows.forEach((row) => next.delete(row.id))
      else rows.forEach((row) => next.add(row.id))
      return next
    })
  }

  const handleToggleOne = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirmDelete = async () => {
    await deleteTxs.mutateAsync(pendingDeleteIds)
    setSelected(new Set())
    setPendingDeleteIds([])
  }

  useEffect(() => {
    if (!shouldFocusSearch) return
    searchRef.current?.focus()
    searchRef.current?.select()
    onSearchFocusHandled?.()
  }, [shouldFocusSearch, onSearchFocusHandled])

  if (transactionsPending || categoriesPending || accountsPending) {
    return <TransactionsSkeleton />
  }

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
              onQueryChange(event.target.value)
              setPage(1)
            }}
            placeholder={t('tx.search')}
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <CategoryFilterSelect
            categories={categories}
            value={categoryId}
            ariaLabel={t('tx.filterCategory')}
            emptyLabel={t('tx.filterCategoryAll')}
            onChange={(value) => {
              onCategoryChange(value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <FilterSelect
            value={accountId}
            ariaLabel={t('tx.filterAccount')}
            emptyLabel={t('tx.filterAccountAll')}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            onChange={(value) => {
              onAccountChange(value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {typeFilters.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => {
                onTypeChange(filterOption.value)
                setPage(1)
              }}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                type === filterOption.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{t('tx.count', { n: filtered.length })}</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent px-4 py-2 text-sm">
          <span className="font-medium text-accent-foreground">{t('tx.selected', { n: selected.size })}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t('tx.deselect')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setPendingDeleteIds(Array.from(selected))}>
              <Trash2 className="size-3.5" /> {t('tx.delete')}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleToggleAll}
                  aria-label={t('tx.selectAll')}
                  className="size-4 accent-primary"
                />
              </th>
              <SortHeader label={t('tx.colDate')} col="date" sortKey={sortKey} asc={asc} onClick={handleSort} />
              <SortHeader label={t('tx.colCategory')} col="category" sortKey={sortKey} asc={asc} onClick={handleSort} />
              <SortHeader label={t('tx.colAccount')} col="account" sortKey={sortKey} asc={asc} onClick={handleSort} />
              <SortHeader label={t('tx.colAmount')} col="amount" sortKey={sortKey} asc={asc} onClick={handleSort} align="right" />
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const category = getCategory(row.categoryId)
              const categoryLabel = getTransactionCategoryLabel({
                transaction: row,
                categoryName: category?.name,
                transferLabel: t('tx.transfer'),
              })

              return (
                <tr
                  key={row.id}
                  className={cn('group transition-colors hover:bg-muted/40', selected.has(row.id) && 'bg-accent/40')}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => handleToggleOne(row.id)}
                      aria-label={t('tx.selectItem', { name: categoryLabel })}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 tabular whitespace-nowrap text-muted-foreground">
                    {formatShortDate(row.date)}
                  </td>
                  <td className="px-4 py-3">
                    {row.type === 'transfer' ? (
                      <span className="inline-flex items-center gap-1.5 text-transfer">
                        <ArrowLeftRight className="size-3.5" /> {t('tx.transfer')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon
                          name={category?.icon}
                          className="size-3.5"
                          style={{ color: colorVar(category?.color ?? 'chart-1') }}
                        />
                        <span className="flex items-center gap-1.5">
                          {category?.name}
                          {row.receipt && <Paperclip className="size-3 text-muted-foreground" />}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getAccount(row.accountId)?.name}</td>
                  <td className={cn('px-4 py-3 text-right tabular font-semibold', amountColorClass(row.type))}>
                    {formatSigned(row.amount, row.type)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        aria-label={t('tx.edit')}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteIds([row.id])}
                        aria-label={t('tx.deleteOne')}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-expense-muted hover:text-expense"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('tx.notFound')}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('tx.page', { n: current, total: pageCount })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="size-3.5" /> {t('tx.pagePrev')}
          </Button>
          <Button variant="outline" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
            {t('tx.pageNext')} <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function FilterSelect({
  value,
  ariaLabel,
  emptyLabel,
  options,
  onChange,
}: {
  value: string
  ariaLabel: string
  emptyLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue>{options.find((option) => option.value === value)?.label ?? emptyLabel}</SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            <SelectItem value="">{emptyLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}

function SortHeader({
  label,
  col,
  sortKey,
  asc,
  onClick,
  align = 'left',
}: {
  label: string
  col: SortKey
  sortKey: SortKey
  asc: boolean
  onClick: (col: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === col

  return (
    <th className={cn('px-4 py-3 font-medium', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
          align === 'right' && 'ml-auto',
        )}
      >
        {label}
        {active ? (
          asc ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}
