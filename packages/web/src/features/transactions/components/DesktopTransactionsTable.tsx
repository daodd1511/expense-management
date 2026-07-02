
import { ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Paperclip, Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { Input } from '@/shared/components/ui/input'
import { amountColorClass, formatShortDate, formatSigned } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Transaction, TxType } from '@/core/types'
import { cn } from '@/shared/lib/utils'

type SortKey = 'date' | 'merchant' | 'category' | 'account' | 'amount'
const PAGE_SIZE = 9

export function DesktopTransactionsTable({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { transactions, getCategory, getAccount, deleteTransaction } = useStore()
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TxType | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [asc, setAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

  const TYPE_FILTERS: { value: TxType | 'all'; label: string }[] = [
    { value: 'all', label: t('tx.filterAll') },
    { value: 'expense', label: t('tx.filterExpense') },
    { value: 'income', label: t('tx.filterIncome') },
    { value: 'transfer', label: t('tx.filterTransfer') },
  ]

  const filtered = useMemo(() => {
    const rows = transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (query && !tx.merchant.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    const dir = asc ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'merchant':
          return a.merchant.localeCompare(b.merchant) * dir
        case 'category':
          return (getCategory(a.categoryId)?.name ?? '').localeCompare(getCategory(b.categoryId)?.name ?? '') * dir
        case 'account':
          return (getAccount(a.accountId)?.name ?? '').localeCompare(getAccount(b.accountId)?.name ?? '') * dir
        case 'amount':
          return (a.amount - b.amount) * dir
        default:
          return a.date.localeCompare(b.date) * dir
      }
    })
  }, [transactions, query, type, sortKey, asc, getCategory, getAccount])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAsc((a) => !a)
    else {
      setSortKey(key)
      setAsc(false)
    }
  }
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id))
      else rows.forEach((r) => next.add(r.id))
      return next
    })
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const bulkDelete = () => {
    setPendingDeleteIds(Array.from(selected))
  }
  const confirmDelete = () => {
    pendingDeleteIds.forEach((id) => deleteTransaction(id))
    setSelected(new Set())
    setPendingDeleteIds([])
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder={t('tx.search')}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setType(f.value)
                setPage(1)
              }}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                type === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{t('tx.count', { n: filtered.length })}</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent px-4 py-2 text-sm">
          <span className="font-medium text-accent-foreground">{t('tx.selected', { n: selected.size })}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t('tx.deselect')}
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="size-3.5" /> {t('tx.delete')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  aria-label={t('tx.selectAll')}
                  className="size-4 accent-primary"
                />
              </th>
              <SortHeader label={t('tx.colDate')} col="date" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label={t('tx.colMerchant')} col="merchant" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label={t('tx.colCategory')} col="category" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label={t('tx.colAccount')} col="account" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label={t('tx.colAmount')} col="amount" sortKey={sortKey} asc={asc} onClick={toggleSort} align="right" />
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const cat = getCategory(row.categoryId)
              return (
                <tr
                  key={row.id}
                  className={cn('group transition-colors hover:bg-muted/40', selected.has(row.id) && 'bg-accent/40')}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={t('tx.selectItem', { name: row.merchant })}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 tabular whitespace-nowrap text-muted-foreground">
                    {formatShortDate(row.date)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-1.5">
                      {row.merchant}
                      {row.receipt && <Paperclip className="size-3 text-muted-foreground" />}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.type === 'transfer' ? (
                      <span className="inline-flex items-center gap-1.5 text-transfer">
                        <ArrowLeftRight className="size-3.5" /> {t('tx.transfer')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon
                          name={cat?.icon}
                          className="size-3.5"
                          style={{ color: colorVar(cat?.color ?? 'chart-1') }}
                        />
                        {cat?.name}
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

      {/* Pagination */}
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
        onConfirm={confirmDelete}
      />
    </div>
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
  onClick: (c: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === col
  return (
    <th className={cn('px-4 py-3 font-medium', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          active && 'text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        {active ? (
          asc ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5 opacity-30" />
        )}
      </button>
    </th>
  )
}
