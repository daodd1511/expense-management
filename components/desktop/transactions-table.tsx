'use client'

import { ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Paperclip, Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CategoryIcon, colorVar } from '@/components/category-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { amountColorClass, formatShortDate, formatSigned } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Transaction, TxType } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortKey = 'date' | 'merchant' | 'category' | 'account' | 'amount'
const PAGE_SIZE = 9

export function DesktopTransactionsTable({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { transactions, getCategory, getAccount, deleteTransaction } = useStore()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TxType | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [asc, setAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const rows = transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false
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
    selected.forEach((id) => deleteTransaction(id))
    setSelected(new Set())
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
            placeholder="Tìm theo nơi giao dịch..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setPage(1)
              }}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                type === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'all' ? 'Tất cả' : t === 'expense' ? 'Chi' : t === 'income' ? 'Thu' : 'Chuyển'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} giao dịch</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent px-4 py-2 text-sm">
          <span className="font-medium text-accent-foreground">Đã chọn {selected.size} mục</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="size-3.5" /> Xóa
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
                  aria-label="Chọn tất cả"
                  className="size-4 accent-primary"
                />
              </th>
              <SortHeader label="Ngày" col="date" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label="Nơi giao dịch" col="merchant" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label="Danh mục" col="category" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label="Tài khoản" col="account" sortKey={sortKey} asc={asc} onClick={toggleSort} />
              <SortHeader label="Số tiền" col="amount" sortKey={sortKey} asc={asc} onClick={toggleSort} align="right" />
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => {
              const cat = getCategory(t.categoryId)
              return (
                <tr
                  key={t.id}
                  className={cn('group transition-colors hover:bg-muted/40', selected.has(t.id) && 'bg-accent/40')}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      aria-label={`Chọn ${t.merchant}`}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 tabular whitespace-nowrap text-muted-foreground">
                    {formatShortDate(t.date)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-1.5">
                      {t.merchant}
                      {t.receipt && <Paperclip className="size-3 text-muted-foreground" />}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.type === 'transfer' ? (
                      <span className="inline-flex items-center gap-1.5 text-transfer">
                        <ArrowLeftRight className="size-3.5" /> Chuyển khoản
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
                  <td className="px-4 py-3 text-muted-foreground">{getAccount(t.accountId)?.name}</td>
                  <td className={cn('px-4 py-3 text-right tabular font-semibold', amountColorClass(t.type))}>
                    {formatSigned(t.amount, t.type)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        aria-label="Sửa"
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTransaction(t.id)}
                        aria-label="Xóa"
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
          <p className="py-12 text-center text-sm text-muted-foreground">Không tìm thấy giao dịch.</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Trang {current} / {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="size-3.5" /> Trước
          </Button>
          <Button variant="outline" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
            Sau <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
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
