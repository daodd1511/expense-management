
import { ArrowLeftRight, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { useSwipeActions } from '@/shared/hooks/useSwipeActions'
import { amountColorClass, formatSigned, formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useCategoryLookup } from '@/features/categories/queries'
import { useAccountLookup } from '@/features/accounts/queries'
import { useDeleteTransaction } from '@/features/transactions/queries'
import type { Transaction } from '@/core/types'
import { cn } from '@/shared/lib/utils'

const SWIPE_ACTION_WIDTH = 132

function formatCategoryLabel({
  categoryName,
  parentCategoryName,
}: {
  categoryName?: string
  parentCategoryName?: string
}) {
  return parentCategoryName
    ? `${parentCategoryName} › ${categoryName}`
    : categoryName
}

function Leading({ tx }: { tx: Transaction }) {
  const getCategory = useCategoryLookup()
  if (tx.type === 'transfer') {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-transfer">
        <ArrowLeftRight className="size-4" />
      </span>
    )
  }
  const cat = getCategory(tx.categoryId)
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `color-mix(in oklab, ${colorVar(cat?.color ?? 'chart-1')} 16%, transparent)` }}
    >
      <CategoryIcon
        name={cat?.icon}
        className="size-4"
        style={{ color: colorVar(cat?.color ?? 'chart-1') }}
      />
    </span>
  )
}

export function TransactionRow({
  tx,
  onClick,
  swipe = false,
}: {
  tx: Transaction
  onClick?: () => void
  swipe?: boolean
}) {
  const getCategory = useCategoryLookup()
  const getAccount = useAccountLookup()
  const deleteTx = useDeleteTransaction()
  const { t } = useLang()
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const cat = getCategory(tx.categoryId)
  const parentCat = cat?.parentId ? getCategory(cat.parentId) : undefined
  const acc = getAccount(tx.accountId)
  const title =
    tx.type === 'transfer'
      ? t('tx.transfer')
      : formatCategoryLabel({
          categoryName: cat?.name,
          parentCategoryName: parentCat?.name,
        })
  const subtitle =
    tx.type === 'transfer'
      ? `${acc?.name} → ${getAccount(tx.toAccountId)?.name}`
      : acc?.name

  const content = (
    <div
      className={cn('flex items-center gap-3 bg-card px-1 py-2.5', swipe && 'touch-pan-y')}
      style={swipe ? { transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' } : undefined}
      onTouchStart={swipe ? bind.onTouchStart : undefined}
      onTouchMove={swipe ? bind.onTouchMove : undefined}
      onTouchEnd={swipe ? bind.onTouchEnd : undefined}
      onTouchCancel={swipe ? bind.onTouchCancel : undefined}
    >
      <Leading tx={tx} />
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
            {title}
            {tx.receipt && <Paperclip className="size-3 text-muted-foreground" />}
          </span>
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn('tabular text-sm font-semibold', amountColorClass(tx.type))}>
            {formatSigned(tx.amount, tx.type)}
          </span>
          {typeof tx.balanceAfter === 'number' && (
            <span className="text-xs tabular text-muted-foreground">
              {formatVND(tx.balanceAfter)}
            </span>
          )}
          {tx.time && <span className="text-xs text-muted-foreground">{tx.time}</span>}
        </span>
      </button>
    </div>
  )

  if (!swipe) return content

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onClick}
          aria-label="Sửa"
          className="flex w-16 items-center justify-center bg-accent text-accent-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          aria-label="Xóa"
          className="flex w-16 items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {content}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await deleteTx.mutateAsync(tx.id)
          setConfirmDeleteOpen(false)
        }}
      />
    </div>
  )
}
