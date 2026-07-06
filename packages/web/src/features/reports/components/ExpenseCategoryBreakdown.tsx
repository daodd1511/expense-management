import { useState } from 'react'
import type { Category, Account } from '@/core/types'
import { useLang } from '@/core/i18n'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { formatVND } from '@/shared/lib/format'
import type { ReportCategoryAggregate } from '@wallet/shared'
import { ReportTransactionRow as TransactionRow } from './ReportTransactionRow'

export function ExpenseCategoryBreakdown({
  categories,
  getCategory,
  getAccount,
  onTransactionClick,
}: {
  categories: ReportCategoryAggregate[]
  getCategory: (id: string | null | undefined) => Category | undefined
  getAccount: (id: string | null | undefined) => Account | undefined
  onTransactionClick: (transactionId: string) => void
}) {
  const { t } = useLang()
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set())

  if (categories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-40 flex-col items-start justify-center gap-2 p-6">
          <p className="text-sm font-medium">{t('reports.expenseEmptyTitle')}</p>
          <p className="max-w-xl text-sm text-muted-foreground">{t('reports.expenseEmptyDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  const sortedCategories = [...categories].sort((left, right) => {
    if (right.amount !== left.amount) return right.amount - left.amount
    return left.categoryId.localeCompare(right.categoryId)
  })

  const toggleCategory = (categoryId: string, open: boolean) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current)
      if (open) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle>{t('reports.expenseCategories')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sortedCategories.map((category) => {
          const categoryInfo = getCategory(category.categoryId)
          const icon = categoryInfo?.icon
          const color = categoryInfo ? colorVar(categoryInfo.color) : 'var(--muted-foreground)'
          const isOpen = expandedCategoryIds.has(category.categoryId)

          return (
            <Collapsible
              key={category.categoryId}
              open={isOpen}
              onOpenChange={(open) => toggleCategory(category.categoryId, open)}
            >
              <CollapsibleTrigger className="px-3 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: color }}
                  >
                    <CategoryIcon name={icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {categoryInfo?.name ?? category.categoryId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('reports.categoryTransactions', { n: category.transactionCount })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm font-semibold">{formatVND(category.amount)}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(category.percentage * 100)}%</p>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsiblePanel className="pt-2">
                <div className="space-y-1 border-l border-border pl-4">
                  {category.transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      accountName={getAccount(transaction.accountId)?.name ?? transaction.accountId}
                      onClick={() => onTransactionClick(transaction.id)}
                    />
                  ))}
                </div>
              </CollapsiblePanel>
            </Collapsible>
          )
        })}
      </CardContent>
    </Card>
  )
}
