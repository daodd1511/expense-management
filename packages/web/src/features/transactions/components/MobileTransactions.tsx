import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAccounts, useAccountLookup } from '@/features/accounts/queries'
import { useCategories, useCategoryLookup } from '@/features/categories/queries'
import { CategoryFilterSelect } from '@/features/categories/components/CategoryFilterSelect'
import { TransactionsMonthSwitcher } from '@/features/transactions/components/TransactionsMonthSwitcher'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { useTransactions } from '@/features/transactions/queries'
import type { TransactionFilterType } from '@/features/transactions/view-state'
import { useLang } from '@/core/i18n'
import type { Transaction } from '@/core/types'
import { MobilePageContainer } from '@/shared/components/MobilePageContainer'
import { Input } from '@/shared/components/ui/input'
import { TransactionsSkeleton } from '@/shared/components/Skeleton'
import { Select, SelectItem, SelectPopup, SelectPortal, SelectPositioner, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { formatDayLabel, formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

function signedAmount(transaction: Transaction) {
  if (transaction.type === 'income') return transaction.amount
  if (transaction.type === 'expense') return -transaction.amount
  return 0
}

export function MobileTransactions({
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
}) {
  const { data: transactions = [], isPending: transactionsPending } = useTransactions(month)
  const { data: categories = [], isPending: categoriesPending } = useCategories()
  const { data: accounts = [], isPending: accountsPending } = useAccounts()
  const getCategory = useCategoryLookup()
  const getAccount = useAccountLookup()
  const { t, lang } = useLang()
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const typeFilters: { value: TransactionFilterType; label: string }[] = [
    { value: 'all', label: t('tx.filterAll') },
    { value: 'expense', label: t('tx.filterExpense') },
    { value: 'income', label: t('tx.filterIncome') },
    { value: 'transfer', label: t('tx.filterTransfer') },
  ]

  const groups = useMemo(() => {
    const filtered = transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (categoryId && tx.categoryId !== categoryId) return false
      if (accountId && tx.accountId !== accountId && tx.toAccountId !== accountId) return false
      if (query) {
        const searchValue = query.toLowerCase()
        const haystack = [
          tx.merchant,
          tx.note,
          getCategory(tx.categoryId)?.name,
          getAccount(tx.accountId)?.name,
          getAccount(tx.toAccountId)?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(searchValue)) return false
      }
      return true
    })

    const map = new Map<string, Transaction[]>()
    for (const tx of filtered) {
      const key = tx.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }

    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, type, categoryId, accountId, query, getCategory, getAccount])

  if (transactionsPending || categoriesPending || accountsPending) {
    return <TransactionsSkeleton mobile />
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <MobilePageContainer className="gap-3">
        <TransactionsMonthSwitcher month={month} onChange={onMonthChange} className="justify-between" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('tx.searchMobile')}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {typeFilters.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => onTypeChange(filterOption.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                type === filterOption.value
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {filterOption.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMoreFilters((current) => !current)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              categoryId || accountId
                ? 'border-transparent bg-accent text-foreground'
                : 'border-border bg-background text-foreground',
            )}
          >
            {t('tx.moreFilters')}
          </button>
        </div>

        {showMoreFilters && (
          <div className="grid grid-cols-1 gap-2">
            <CategoryFilterSelect
              categories={categories}
              value={categoryId}
              ariaLabel={t('tx.filterCategory')}
              emptyLabel={t('tx.filterCategoryAll')}
              onChange={onCategoryChange}
            />
            <FilterSelect
              value={accountId}
              ariaLabel={t('tx.filterAccount')}
              emptyLabel={t('tx.filterAccountAll')}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              onChange={onAccountChange}
            />
          </div>
        )}

        {groups.map(([day, items]) => {
          const dayNet = items.reduce(
            (sum, tx) => sum + signedAmount(tx),
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
                    <TransactionRow key={tx.id} tx={tx} balanceAccountId={accountId || undefined} onClick={() => onEdit(tx)} swipe />
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {groups.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('tx.empty')}</p>
        )}
      </MobilePageContainer>
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
