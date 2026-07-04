
import { useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/auth'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { PullToRefreshIndicator } from '@/shared/components/PullToRefreshIndicator'
import { usePullToRefresh } from '@/shared/hooks/usePullToRefresh'
import { Input } from '@/shared/components/ui/input'
import { formatDayLabel, formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Transaction, TxType } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function MobileTransactions({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { user } = useAuth()
  const { transactions } = useStore()
  const { t, lang } = useLang()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TxType | 'all'>('all')
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] })
    },
  })

  const FILTERS: { value: TxType | 'all'; label: string }[] = [
    { value: 'all', label: t('tx.filterAll') },
    { value: 'expense', label: t('tx.filterExpense') },
    { value: 'income', label: t('tx.filterIncome') },
    { value: 'transfer', label: t('tx.filterTransfer') },
  ]

  const groups = useMemo(() => {
    const filtered = transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false
      if (query && !tx.merchant.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    const map = new Map<string, Transaction[]>()
    for (const tx of filtered) {
      const key = tx.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, query, filter])

  return (
    <div
      {...pullToRefresh.bind}
      className="h-full overflow-y-auto overscroll-contain"
    >
      <PullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        isArmed={pullToRefresh.isArmed}
        isRefreshing={pullToRefresh.isRefreshing}
      />
      <div
        className="flex flex-col gap-3 p-4"
        style={{
          transform: `translateY(${pullToRefresh.pullDistance}px)`,
          transition: 'transform var(--duration-base) var(--ease-out)',
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tx.searchMobile')}
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
            (s, tx) => s + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0),
            0,
          )
          return (
            <div key={day} className="flex flex-col">
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatDayLabel(day, lang, t('date.today'), t('date.yesterday'))}
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {dayNet >= 0 ? '+' : '−'}
                  {formatVND(dayNet)}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border px-2">
                  {items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onClick={() => onEdit(tx)} swipe />
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {groups.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('tx.empty')}</p>
        )}
      </div>
    </div>
  )
}
