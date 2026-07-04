
import { ArrowLeftRight, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { CategoryIcon, colorVar } from '@/shared/components/CategoryIcon'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { amountColorClass, formatSigned, formatTime } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useStore } from '@/core/store'
import type { Transaction } from '@/core/types'
import { cn } from '@/shared/lib/utils'

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
  const { getCategory } = useStore()
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
  const { getCategory, getAccount, deleteTransaction } = useStore()
  const { t } = useLang()
  const [dx, setDx] = useState(0)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const startX = useRef<number | null>(null)
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

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return
    const delta = e.touches[0].clientX - startX.current
    if (delta < 0) setDx(Math.max(delta, -132))
  }
  const onTouchEnd = () => {
    setDx((d) => (d < -66 ? -132 : 0))
    startX.current = null
  }

  const content = (
    <div
      className="flex items-center gap-3 bg-card px-1 py-2.5"
      style={swipe ? { transform: `translateX(${dx}px)`, transition: 'transform 0.2s' } : undefined}
      onTouchStart={swipe ? onTouchStart : undefined}
      onTouchMove={swipe ? onTouchMove : undefined}
      onTouchEnd={swipe ? onTouchEnd : undefined}
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
          <span className="text-xs text-muted-foreground">{formatTime(tx.date)}</span>
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
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          deleteTransaction(tx.id)
        }}
      />
    </div>
  )
}
