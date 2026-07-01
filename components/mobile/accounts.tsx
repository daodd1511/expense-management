
import { Banknote, CreditCard, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { AccountForm } from '@/components/shared/account-form'
import { Card, CardContent } from '@/components/ui/card'
import { BottomSheet } from '@/components/ui/overlay'
import { formatVND } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import type { Account, AccountKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND_ICONS: Record<AccountKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  card: CreditCard,
  ewallet: Wallet,
}

function AccountRow({
  account,
  kindLabel,
  onEdit,
  onDelete,
}: {
  account: Account
  kindLabel: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [dx, setDx] = useState(0)
  const startX = useRef<number | null>(null)
  const Icon = KIND_ICONS[account.kind]
  const negative = account.balance < 0

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

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="flex w-16 items-center justify-center bg-accent text-accent-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex w-16 items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div
        className="flex items-center gap-3 bg-card py-3"
        style={{ transform: `translateX(${dx}px)`, transition: 'transform 0.2s' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <span className="flex flex-col">
            <span className="text-sm font-medium">{account.name}</span>
            <span className="text-xs text-muted-foreground">{kindLabel}</span>
          </span>
          <span className={cn('tabular shrink-0 text-sm font-semibold', negative ? 'text-expense' : 'text-foreground')}>
            {negative ? '−' : ''}{formatVND(Math.abs(account.balance))}
          </span>
        </button>
      </div>
    </div>
  )
}

export function MobileAccounts() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useStore()
  const { t } = useLang()
  const net = accounts.reduce((s, a) => s + a.balance, 0)
  const [editing, setEditing] = useState<Account | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const KIND_LABELS: Record<AccountKind, string> = {
    cash: t('accounts.kindCash'),
    bank: t('accounts.kindBank'),
    card: t('accounts.kindCard'),
    ewallet: t('accounts.kindEwallet'),
  }

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (account: Account) => {
    setEditing(account)
    setSheetOpen(true)
  }

  const close = () => {
    setSheetOpen(false)
    setEditing(null)
  }

  const handleSubmit = (data: Omit<Account, 'id'>) => {
    if (editing) updateAccount(editing.id, data)
    else addAccount(data)
    close()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Wallet className="size-4" /> {t('accounts.netWorth')}
          </div>
          <div className="tabular mt-1 text-3xl font-bold tracking-tight">{formatVND(net)}</div>
          <p className="mt-1 text-sm opacity-80">{t('accounts.count', { n: accounts.length })}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold tracking-tight">{t('accounts.list')}</h2>
        </CardContent>
        <div className="flex flex-col divide-y divide-border px-4">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              kindLabel={KIND_LABELS[a.kind]}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteAccount(a.id)}
            />
          ))}
        </div>
        <div className="pb-1" />
      </Card>

      <button
        type="button"
        onClick={openAdd}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-4" /> {t('accounts.add')}
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={close}
        title={editing ? t('accounts.editTitle') : t('accounts.addTitle')}
      >
        <AccountForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={close} />
      </BottomSheet>
    </div>
  )
}
