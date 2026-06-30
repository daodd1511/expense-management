'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TransactionRow } from '@/components/shared/transaction-row'
import { Input } from '@/components/ui/input'
import { formatDayLabel, formatVND } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Transaction, TxType } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS: { value: TxType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' },
  { value: 'transfer', label: 'Chuyển' },
]

export function MobileTransactions({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { transactions } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TxType | 'all'>('all')

  const groups = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = t.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, query, filter])

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm giao dịch..."
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.map(([day, items]) => {
        const dayNet = items.reduce(
          (s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
          0,
        )
        return (
          <div key={day} className="flex flex-col">
            <div className="flex items-center justify-between px-1 pb-1 pt-3">
              <span className="text-xs font-semibold text-muted-foreground">{formatDayLabel(day)}</span>
              <span className="tabular text-xs text-muted-foreground">
                {dayNet >= 0 ? '+' : '−'}
                {formatVND(dayNet)}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="divide-y divide-border px-2">
                {items.map((t) => (
                  <TransactionRow key={t.id} tx={t} onClick={() => onEdit(t)} swipe />
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {groups.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">Không có giao dịch nào.</p>
      )}
    </div>
  )
}
